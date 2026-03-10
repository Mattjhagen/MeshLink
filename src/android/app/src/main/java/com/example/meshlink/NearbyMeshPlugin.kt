package com.example.meshlink

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import java.util.UUID

@CapacitorPlugin(
    name = "NearbyMesh",
    permissions = [
        Permission(alias = "location", strings = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION]),
        Permission(alias = "bluetooth", strings = [Manifest.permission.BLUETOOTH, Manifest.permission.BLUETOOTH_ADMIN]),
        // Note: Android 12+ requires BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT
        // Android 13+ requires NEARBY_WIFI_DEVICES
    ]
)
class NearbyMeshPlugin : Plugin() {

    private val SERVICE_ID = "com.example.meshlink.OFFLINE_MESH"
    private var myNodeId = UUID.randomUUID().toString().substring(0, 8)
    private var myDisplayName = "Anonymous"
    
    private val connectedEndpoints = mutableSetOf<String>()
    private val seenMessageIds = mutableSetOf<String>()

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type == Payload.Type.BYTES) {
                val dataStr = String(payload.asBytes()!!)
                
                // Format: <msgId>|<senderEmail>|<recipientEmail>|<encryptedContent>|<iv>|<conversationId>
                val parts = dataStr.split("|", limit = 6)
                if (parts.size == 6) {
                    val msgId = parts[0]
                    if (!seenMessageIds.contains(msgId)) {
                        seenMessageIds.add(msgId)
                        
                        // Fire event to React
                        val ret = JSObject()
                        ret.put("id", msgId)
                        ret.put("sender_email", parts[1])
                        ret.put("recipient_email", parts[2])
                        ret.put("encrypted_content", parts[3])
                        ret.put("iv", parts[4])
                        ret.put("conversation_id", parts[5])
                        
                        notifyListeners("onMessageReceived", ret)
                        
                        rebroadcastMessage(endpointId, dataStr)
                    }
                } else if (parts.size == 3 && parts[0] == "NODE_INFO") {
                    // Custom handshake to exchange emails/names offline
                    val nodeEmail = parts[1]
                    val nodeName = parts[2]
                    
                    val ret = JSObject()
                    ret.put("endpointId", endpointId)
                    ret.put("email", nodeEmail)
                    ret.put("name", nodeName)
                    notifyListeners("onNodeDiscovered", ret)
                    
                    // Reply back to them with my info if they requested
                    if (nodeEmail != "response") { // Simple flag to avoid bounce loop
                        val myInfo = "NODE_INFO|response|$myDisplayName"
                        Nearby.getConnectionsClient(context).sendPayload(
                            endpointId, 
                            Payload.fromBytes(myInfo.toByteArray())
                        )
                    }
                }
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {}
    }

    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            Nearby.getConnectionsClient(context).acceptConnection(endpointId, payloadCallback)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            if (result.status.isSuccess) {
                connectedEndpoints.add(endpointId)
                // When connected, tell the peer who I am so their UI can show my email
                val myInfo = "NODE_INFO|$myNodeId|$myDisplayName"
                Nearby.getConnectionsClient(context).sendPayload(
                    endpointId,
                    Payload.fromBytes(myInfo.toByteArray())
                )
            }
        }

        override fun onDisconnected(endpointId: String) {
            connectedEndpoints.remove(endpointId)
            val ret = JSObject()
            ret.put("endpointId", endpointId)
            notifyListeners("onNodeLost", ret)
        }
    }

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            Nearby.getConnectionsClient(context)
                .requestConnection(myDisplayName, endpointId, connectionLifecycleCallback)
                .addOnSuccessListener { Log.d("NearbyMesh", "Requested conn to $endpointId") }
                .addOnFailureListener { Log.e("NearbyMesh", "Request failed to $endpointId") }
        }

        override fun onEndpointLost(endpointId: String) {}
    }

    @PluginMethod
    fun initializeNode(call: PluginCall) {
        val email = call.getString("email") ?: UUID.randomUUID().toString()
        val name = call.getString("displayName") ?: "User"
        myNodeId = email
        myDisplayName = name
        call.resolve()
    }

    @PluginMethod
    fun startMesh(call: PluginCall) {
        val connectionsClient = Nearby.getConnectionsClient(context)
        
        val advOptions = AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        connectionsClient.startAdvertising(myDisplayName, SERVICE_ID, connectionLifecycleCallback, advOptions)

        val discOptions = DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        connectionsClient.startDiscovery(SERVICE_ID, endpointDiscoveryCallback, discOptions)

        call.resolve()
    }

    @PluginMethod
    fun sendMessage(call: PluginCall) {
        val msgId = UUID.randomUUID().toString()
        val senderEmail = call.getString("sender_email") ?: ""
        val recipientEmail = call.getString("recipient_email") ?: ""
        val encryptedContent = call.getString("encrypted_content") ?: ""
        val iv = call.getString("iv") ?: ""
        val conversationId = call.getString("conversation_id") ?: ""

        val rawStr = "$msgId|$senderEmail|$recipientEmail|$encryptedContent|$iv|$conversationId"
        seenMessageIds.add(msgId)

        if (connectedEndpoints.isNotEmpty()) {
            val payload = Payload.fromBytes(rawStr.toByteArray())
            Nearby.getConnectionsClient(context).sendPayload(connectedEndpoints.toList(), payload)
        }
        
        call.resolve()
    }

    private fun rebroadcastMessage(fromEndpoint: String, rawPayload: String) {
        val forwardList = connectedEndpoints.filter { it != fromEndpoint }
        if (forwardList.isNotEmpty()) {
            Nearby.getConnectionsClient(context).sendPayload(
                forwardList, 
                Payload.fromBytes(rawPayload.toByteArray())
            )
        }
    }
}
