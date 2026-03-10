package com.example.meshlink

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.getcapacitor.Plugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Register the Nearby Mesh offline Plugin
        registerPlugin(NearbyMeshPlugin::class.java)
    }
}
