import { CodeModuleFile, DictationMode, AppSettings } from '../types';

export const initialModes: DictationMode[] = [
  {
    id: "email",
    name: "Email Professional",
    icon: "Mail",
    description: "Transforms raw voice dictation into clear, polite, and professional email correspondence.",
    llmModel: "gpt-4o",
    voiceModel: "whisper-large-v3",
    systemPrompt: "You are an expert executive assistant. Transform the raw spoken dictation into a well-structured, professional, polite email. Fix grammatical errors, format appropriate greetings/sign-offs, and maintain the user's core intent without adding hallucinated facts.",
    temperature: 0.3,
    maxTokens: 800,
    contextRules: {
      includeAppInfo: true,
      includeSelectedText: true,
      includeClipboard: true
    },
    replacements: {
      "atentamente": "Atentamente,",
      "estimado": "Estimado/a"
    }
  },
  {
    id: "code",
    name: "Code & Technical",
    icon: "Code",
    description: "Converts voice dictation into clean, idiomatic programming code, shell commands, or technical documentation.",
    llmModel: "claude-3-5-sonnet",
    voiceModel: "whisper-large-v3",
    systemPrompt: "You are a senior principal software engineer. Convert the dictated thoughts into precise code snippets, function definitions, or technical architecture markdown. Use the active Application Context (IDE or terminal name) to match syntax and language conventions.",
    temperature: 0.1,
    maxTokens: 1500,
    contextRules: {
      includeAppInfo: true,
      includeSelectedText: true,
      includeClipboard: false
    },
    replacements: {
      "null pointer": "NullPointerException",
      "async await": "async/await"
    }
  },
  {
    id: "notes",
    name: "Smart Notes & Summary",
    icon: "FileText",
    description: "Summarizes rambling voice notes into bulleted action items and structured takeaways.",
    llmModel: "llama-3.3-70b-versatile",
    voiceModel: "whisper-large-v3",
    systemPrompt: "You are an expert note-taker. Clean up rambling voice notes into concise markdown bullet points, highlighting key takeaways, action items with owners, and crucial decisions.",
    temperature: 0.4,
    maxTokens: 1000,
    contextRules: {
      includeAppInfo: true,
      includeSelectedText: true,
      includeClipboard: true
    },
    replacements: {}
  },
  {
    id: "translation",
    name: "Natural Translation",
    icon: "Languages",
    description: "Translates spoken speech fluently into target business English or Spanish while preserving tone.",
    llmModel: "gpt-4o-mini",
    voiceModel: "whisper-large-v3",
    systemPrompt: "You are a professional simultaneous interpreter. Translate the user speech accurately and fluently into professional English (or Spanish if spoken in English), eliminating filler words (um, ah, like) and sounding natural.",
    temperature: 0.2,
    maxTokens: 600,
    contextRules: {
      includeAppInfo: false,
      includeSelectedText: false,
      includeClipboard: false
    },
    replacements: {}
  }
];

export const initialSettings: AppSettings = {
  apiKeys: {
    openai: "sk-proj-...",
    groq: "gsk_...",
    anthropic: "sk-ant-...",
    deepgram: "dg_...",
    gemini: "AIzaSy..."
  },
  defaultModel: "groq/llama-3.3-70b-versatile",
  audioSettings: {
    sampleRate: 16000,
    silenceDetectionMs: 1200,
    hotkey: "Ctrl + Space"
  },
  customVocabulary: [
    "WhisperPulse",
    "Mywhis",
    "Jetpack Compose",
    "DataStore",
    "Manifest V3",
    "WebGPU"
  ],
  autoReplacements: {
    "asap": "ASAP",
    "api": "API",
    "json": "JSON"
  }
};

export const codeModuleFiles: CodeModuleFile[] = [
  // Módulo 1: JSON Schemas
  {
    path: "modes.json",
    language: "json",
    title: "Módulo 1.1: modes.json",
    description: "Schema definition for custom dictation modes (Email, Code, Notes, Translation) specifying LLM instructions, voice/text models, and context rules.",
    content: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WhisperPulseModes",
  "type": "array",
  "items": {
    "type": "object",
    "required": [
      "id",
      "name",
      "icon",
      "llmModel",
      "systemPrompt",
      "contextRules"
    ],
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "icon": { "type": "string" },
      "description": { "type": "string" },
      "llmModel": { "type": "string" },
      "voiceModel": { "type": "string" },
      "systemPrompt": { "type": "string" },
      "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
      "maxTokens": { "type": "integer", "minimum": 50 },
      "contextRules": {
        "type": "object",
        "properties": {
          "includeAppInfo": { "type": "boolean" },
          "includeSelectedText": { "type": "boolean" },
          "includeClipboard": { "type": "boolean" }
        }
      },
      "replacements": {
        "type": "object",
        "additionalProperties": { "type": "string" }
      }
    }
  }
}`
  },
  {
    path: "settings.json",
    language: "json",
    title: "Módulo 1.2: settings.json",
    description: "Schema definition for BYOK API keys, audio hardware configuration, custom vocabulary, and text auto-replacements.",
    content: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WhisperPulseSettings",
  "type": "object",
  "required": ["apiKeys", "defaultModel", "audioSettings"],
  "properties": {
    "apiKeys": {
      "type": "object",
      "properties": {
        "openai": { "type": "string" },
        "groq": { "type": "string" },
        "anthropic": { "type": "string" },
        "deepgram": { "type": "string" },
        "gemini": { "type": "string" }
      }
    },
    "defaultModel": { "type": "string" },
    "audioSettings": {
      "type": "object",
      "properties": {
        "sampleRate": { "type": "integer" },
        "silenceDetectionMs": { "type": "integer" },
        "hotkey": { "type": "string" }
      }
    },
    "customVocabulary": {
      "type": "array",
      "items": { "type": "string" }
    },
    "autoReplacements": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    }
  }
}`
  },

  // Módulo 2: Android (Kotlin)
  {
    path: "android/VoiceDictationAccessibilityService.kt",
    language: "kotlin",
    title: "Módulo 2.1: VoiceDictationAccessibilityService.kt",
    description: "Android Accessibility Service for detecting active package/app context and injecting transcribed text into focused fields using AccessibilityNodeInfo.",
    content: `package com.whisperpulse.accessibility

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.os.Bundle
import android.util.Log

class VoiceDictationAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "VoiceDictationService"
        var instance: VoiceDictationAccessibilityService? = null
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.d(TAG, "VoiceDictationAccessibilityService connected successfully.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_FOCUSED ||
            event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            
            val packageName = event.packageName?.toString() ?: "unknown.app"
            val className = event.className?.toString() ?: ""
            val sourceNode = event.source

            if (sourceNode != null) {
                val nodeText = sourceNode.text?.toString() ?: ""
                // Broadcast active application context for local AI prompt construction
                ActiveContextHolder.updateContext(
                    packageName = packageName,
                    appName = resolveAppName(packageName),
                    focusedText = nodeText
                )
                sourceNode.recycle()
            }
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted.")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    /**
     * Injects processed AI text directly into the currently focused input field.
     * Respects security: skips password fields and handles smart whitespace appending.
     */
    fun injectTextIntoActiveField(textToInsert: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val focusedNode = findFocusedEditableNode(rootNode)

        return if (focusedNode != null) {
            // 1. Password Protection Check (Crucial for privacy)
            if (focusedNode.isPassword) {
                Log.w(TAG, "Mywhis Security: Focused node is a password field. Disabling auto-injection for privacy.")
                focusedNode.recycle()
                rootNode.recycle()
                return false
            }

            // 2. Smart Spacing Append: inspect text already in field
            val existingText = focusedNode.text?.toString() ?: ""
            val finalText = if (existingText.isNotEmpty() && !existingText.endsWith(" ") && !existingText.endsWith("\n")) {
                "$existingText $textToInsert"
            } else {
                "$existingText$textToInsert"
            }

            val arguments = Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, finalText)
            }
            val success = focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
            focusedNode.recycle()
            rootNode.recycle()
            success
        } else {
            rootNode.recycle()
            false
        }
    }

    private fun findFocusedEditableNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (node.isFocused && node.isEditable) {
            return node
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val result = findFocusedEditableNode(child)
            if (result != null) {
                node.recycle()
                return result
            }
            child.recycle()
        }
        return null
    }

    private fun resolveAppName(packageName: String): String {
        return when {
            packageName.contains("whatsapp") -> "WhatsApp"
            packageName.contains("slack") -> "Slack"
            packageName.contains("gmail") -> "Gmail"
            packageName.contains("chrome") -> "Google Chrome"
            packageName.contains("notion") -> "Notion"
            else -> packageName.substringAfterLast('.')
        }
    }
}

object ActiveContextHolder {
    var currentPackageName: String = ""
        private set
    var currentAppName: String = ""
        private set
    var currentFocusedText: String = ""
        private set

    fun updateContext(packageName: String, appName: String, focusedText: String) {
        currentPackageName = packageName
        currentAppName = appName
        currentFocusedText = focusedText
    }
}`
  },
  {
    path: "android/OverlayBubbleManager.kt",
    language: "kotlin",
    title: "Módulo 2.2: OverlayBubbleManager.kt",
    description: "Manages the persistent floating bubble over other apps using TYPE_APPLICATION_OVERLAY with drag gestures, single tap to record, and long-press radial menu.",
    content: `package com.whisperpulse.overlay

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.Toast
import com.whisperpulse.R

class OverlayBubbleManager(private val context: Context) {

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private var floatingView: View? = null
    private lateinit var params: WindowManager.LayoutParams
    private var isAttached = false

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false

    fun showBubble(onTapRecord: () -> Unit, onLongPressMenu: () -> Unit) {
        if (isAttached) return

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 100
            y = 300
        }

        val inflater = LayoutInflater.from(context)
        floatingView = inflater.inflate(R.layout.widget_floating_bubble, null)

        val bubbleIcon = floatingView?.findViewById<ImageView>(R.id.imgBubbleIcon)

        var lastTouchDown = 0L

        floatingView?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    lastTouchDown = System.currentTimeMillis()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = (event.rawX - initialTouchX).toInt()
                    val deltaY = (event.rawY - initialTouchY).toInt()

                    if (Math.hypot(deltaX.toDouble(), deltaY.toDouble()) > 10) {
                        isDragging = true
                        params.x = initialX + deltaX
                        params.y = initialY + deltaY
                        windowManager.updateViewLayout(floatingView, params)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    val duration = System.currentTimeMillis() - lastTouchDown
                    if (!isDragging) {
                        if (duration > 600) {
                            // Long press -> Radial menu of modes
                            onLongPressMenu()
                        } else {
                            // Short tap -> Toggle recording
                            onTapRecord()
                        }
                    }
                    true
                }
                else -> false
            }
        }

        try {
            windowManager.addView(floatingView, params)
            isAttached = true
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun removeBubble() {
        if (isAttached && floatingView != null) {
            windowManager.removeView(floatingView)
            floatingView = null
            isAttached = false
        }
    }

    fun updateState(isRecording: Boolean) {
        val icon = floatingView?.findViewById<ImageView>(R.id.imgBubbleIcon) ?: return
        if (isRecording) {
            icon.setBackgroundResource(R.drawable.bg_bubble_recording)
            icon.animate().scaleX(1.15f).scaleY(1.15f).setDuration(300).start()
        } else {
            icon.setBackgroundResource(R.drawable.bg_bubble_idle)
            icon.animate().scaleX(1.0f).scaleY(1.0f).setDuration(300).start()
        }
    }
}`
  },
  {
    path: "android/ForegroundDictationService.kt",
    language: "kotlin",
    title: "Módulo 2.3: ForegroundDictationService.kt",
    description: "Foreground service ensuring the OS keeps the floating bubble and voice recorder active without battery optimization kills.",
    content: `package com.whisperpulse.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.whisperpulse.R
import com.whisperpulse.overlay.OverlayBubbleManager

class ForegroundDictationService : Service() {

    companion object {
        private const val CHANNEL_ID = "WhisperPulseForegroundChannel"
        private const val NOTIFICATION_ID = 9999
        const val ACTION_START = "ACTION_START_DICTATION"
        const val ACTION_STOP = "ACTION_STOP_DICTATION"
    }

    private lateinit var bubbleManager: OverlayBubbleManager
    private var isRecording = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        bubbleManager = OverlayBubbleManager(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                startForeground(NOTIFICATION_ID, createNotification())
                bubbleManager.showBubble(
                    onTapRecord = { toggleRecording() },
                    onLongPressMenu = { showModesRadialMenu() }
                )
            }
            ACTION_STOP -> {
                bubbleManager.removeBubble()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun toggleRecording() {
        isRecording = !isRecording
        bubbleManager.updateState(isRecording)
        if (isRecording) {
            // Start audio capture & Local/API Whisper transcription stream
        } else {
            // Stop audio capture, transform with LLM and inject via Accessibility Service
        }
    }

    private fun showModesRadialMenu() {
        // Trigger local Jetpack Compose bottom sheet or popup for mode selection
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "WhisperPulse Active Listener",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps voice dictation bubble active and ready."
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, ForegroundDictationService::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("WhisperPulse Active")
            .setContentText("Tap floating bubble to dictate. Long press for modes.")
            .setSmallIcon(R.drawable.ic_mic_pulse)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        bubbleManager.removeBubble()
        super.onDestroy()
    }
}`
  },
  {
    path: "android/PermissionOnboardingScreen.kt",
    language: "kotlin",
    title: "Módulo 2.4: PermissionOnboardingScreen.kt",
    description: "Jetpack Compose onboarding UI guiding user through SYSTEM_ALERT_WINDOW, ACCESSIBILITY_SERVICE, and RECORD_AUDIO permissions step-by-step.",
    content: `package com.whisperpulse.ui

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ContextCompat
import androidx.compose.ui.unit.dp

@Composable
fun PermissionOnboardingScreen(onAllPermissionsGranted: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current

    var hasAudioPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                    android.content.pm.PackageManager.PERMISSION_GRANTED
        )
    }

    var hasOverlayPermission by remember {
        mutableStateOf(Settings.canDrawOverlays(context))
    }

    val audioPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasAudioPermission = granted
    }

    val overlayPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) {
        hasOverlayPermission = Settings.canDrawOverlays(context)
    }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Welcome to WhisperPulse", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Local-first voice dictation powered by AI. Configure required permissions to begin.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(32.dp))

            PermissionStepCard(
                title = "1. Microphone Access",
                description = "Required to capture speech dictation.",
                isGranted = hasAudioPermission,
                buttonText = "Grant Mic",
                onClick = {
                    audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            PermissionStepCard(
                title = "2. Floating Overlay",
                description = "Required to display floating dictation button over apps.",
                isGranted = hasOverlayPermission,
                buttonText = "Grant Overlay",
                onClick = {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:\${context.packageName}")
                    )
                    overlayPermissionLauncher.launch(intent)
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            PermissionStepCard(
                title = "3. Accessibility Service",
                description = "Required to read context and paste text into active cursor.",
                isGranted = false, // Dynamic check
                buttonText = "Enable Accessibility",
                onClick = {
                    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                    context.startActivity(intent)
                }
            )

            Spacer(modifier = Modifier.height(40.dp))

            Button(
                onClick = { onAllPermissionsGranted() },
                modifier = Modifier.fillMaxWidth().height(50px.dp), // fixed
                enabled = hasAudioPermission && hasOverlayPermission
            ) {
                Text("Start WhisperPulse Hub")
            }
        }
    }
}

@Composable
fun PermissionStepCard(
    title: String,
    description: String,
    isGranted: Boolean,
    buttonText: String,
    onClick: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(description, style = MaterialTheme.typography.bodySmall)
            }
            if (isGranted) {
                Text("Granted", color = MaterialTheme.colorScheme.primary)
            } else {
                Button(onClick = onClick) {
                    Text(buttonText)
                }
            }
        }
    }
}`
  },
  {
    path: "android/LocalSettingsRepository.kt",
    language: "kotlin",
    title: "Módulo 2.5: LocalSettingsRepository.kt",
    description: "Jetpack DataStore repository for managing BYOK API keys and custom dictation modes locally on device.",
    content: `package com.whisperpulse.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore by preferencesDataStore(name = "whisperpulse_prefs")

class LocalSettingsRepository(private val context: Context) {

    companion object {
        private val OPENAI_KEY = stringPreferencesKey("openai_api_key")
        private val GROQ_KEY = stringPreferencesKey("groq_api_key")
        private val ANTHROPIC_KEY = stringPreferencesKey("anthropic_api_key")
        private val ACTIVE_MODE = stringPreferencesKey("active_dictation_mode")
    }

    val openaiKeyFlow: Flow<String> = context.dataStore.data
        .map { preferences -> preferences[OPENAI_KEY] ?: "" }

    val groqKeyFlow: Flow<String> = context.dataStore.data
        .map { preferences -> preferences[GROQ_KEY] ?: "" }

    suspend fun saveApiKey(provider: String, key: String) {
        context.dataStore.edit { preferences ->
            when (provider.lowercase()) {
                "openai" -> preferences[OPENAI_KEY] = key
                "groq" -> preferences[GROQ_KEY] = key
                "anthropic" -> preferences[ANTHROPIC_KEY] = key
            }
        }
    }

    suspend fun saveActiveMode(modeId: String) {
        context.dataStore.edit { preferences ->
            preferences[ACTIVE_MODE] = modeId
        }
    }
}`
  },
  {
    path: "android/AndroidManifest.xml",
    language: "xml",
    title: "Módulo 2.6: AndroidManifest.xml (Permisos y Servicios)",
    description: "Configuración completa de permisos Android: RECORD_AUDIO, SYSTEM_ALERT_WINDOW, BIND_ACCESSIBILITY_SERVICE, POST_NOTIFICATIONS y FOREGROUND_SERVICE.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.whisperpulse">

    <!-- 1. Permiso de Micrófono para Captura de Voz -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <!-- 2. Permiso para Burbuja Flotante sobre otras Apps -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <!-- 3. Permiso de Notificaciones (Android 13+ / Tiramisu) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- 4. Servicio en Primer Plano para mantener la burbuja activa -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />

    <!-- 5. Exención de optimización de batería (One last thing) -->
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="Mywhis"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Mywhis">

        <!-- Actividad Principal (Pantalla Limpia Minimalista) -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/Theme.Mywhis">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Servicio de Accesibilidad para inyección de texto sin portapapeles -->
        <service
            android:name=".accessibility.VoiceDictationAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- Servicio Foreground para la burbuja flotante persistente -->
        <service
            android:name=".service.ForegroundDictationService"
            android:foregroundServiceType="microphone"
            android:exported="false" />

    </application>
</manifest>`
  },

  // Módulo 2.5: Android Intent ACTION_SEND Share Helper (Compartir texto con cualquier aplicación)
  {
    path: "android/app/src/main/java/com/mywhis/android/share/ShareIntentHelper.kt",
    language: "kotlin",
    title: "Módulo 2.5: ShareIntentHelper.kt (Android Intent ACTION_SEND)",
    description: "Gestor nativo de Android para compartir la transcripción generada con cualquier aplicación instalada (WhatsApp, Telegram, Gmail, Notas, etc.) mediante Intent Chooser del sistema.",
    content: `package com.mywhis.android.share

import android.content.Context
import android.content.Intent

/**
 * Mywhis Android - Compartir texto dictado con cualquier app compatible.
 * Utiliza Intent.ACTION_SEND para abrir el System Share Sheet de Android.
 */
object ShareIntentHelper {

    fun shareText(
        context: Context, 
        text: String, 
        dialogTitle: String = "Compartir transcripción con..."
    ) {
        if (text.isBlank()) return

        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, text)
            putExtra(Intent.EXTRA_TITLE, "Mywhis Dictado")
            type = "text/plain"
        }

        val shareIntent = Intent.createChooser(sendIntent, dialogTitle).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        context.startActivity(shareIntent)
    }
}`
  },

  // Módulo 3: Extension & Web App (TypeScript / Manifest V3)
  {
    path: "extension/manifest.json",
    language: "json",
    title: "Módulo 3.1: manifest.json (Manifest V3)",
    description: "Chrome Extension Manifest V3 configuration granting activeTab, storage, scripting, and content_scripts permissions.",
    content: `{
  "manifest_version": 3,
  "name": "WhisperPulse AI Dictation",
  "version": "1.0.0",
  "description": "Local-first voice dictation and AI context transformer for browsers.",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "clipboardRead"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "assets/icon16.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}`
  },
  {
    path: "extension/contentScript.ts",
    language: "typescript",
    title: "Módulo 3.2: contentScript.ts",
    description: "DOM listener detecting active input, textarea, and contenteditable elements, extracting selected text and injecting processed text at cursor.",
    content: `/**
 * WhisperPulse Content Script - Context & DOM Injection Engine
 */

let lastActiveElement: HTMLElement | null = null;

document.addEventListener('focusin', (event) => {
    const target = event.target as HTMLElement;
    if (isEditable(target)) {
        lastActiveElement = target;
    }
}, true);

function isEditable(el: HTMLElement | null): boolean {
    if (!el) return false;
    const tagName = el.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || el.isContentEditable;
}

export function getApplicationContext() {
    return {
        appName: document.title || window.location.hostname,
        url: window.location.href,
        focusedFieldContent: lastActiveElement ? (lastActiveElement as any).value || lastActiveElement.innerText || '' : ''
    };
}

export function getSelectedText(): string {
    const selection = window.getSelection();
    return selection ? selection.toString() : '';
}

export function injectTextAtCursor(text: string) {
    const target = lastActiveElement || document.activeElement as HTMLElement;
    if (!target) return;

    if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
        const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
        const start = inputEl.selectionStart || 0;
        const end = inputEl.selectionEnd || 0;
        const val = inputEl.value;
        inputEl.value = val.substring(0, start) + text + val.substring(end);
        inputEl.selectionStart = inputEl.selectionEnd = start + text.length;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (target.isContentEditable) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
        }
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_CONTEXT') {
        sendResponse({
            appContext: getApplicationContext(),
            selectedText: getSelectedText()
        });
    } else if (request.action === 'INJECT_TEXT') {
        injectTextAtCursor(request.text);
        sendResponse({ success: true });
    }
});`
  },
  {
    path: "extension/localStorageManager.ts",
    language: "typescript",
    title: "Módulo 3.3: localStorageManager.ts",
    description: "Chrome storage local manager with JSON backup export and import functions (P2P manual config sync).",
    content: `/**
 * Local Storage Manager & P2P Config Sync
 */

export interface ConfigBundle {
  version: string;
  timestamp: number;
  modes: any[];
  settings: any;
}

export const LocalStorageManager = {
  async saveConfig(config: ConfigBundle): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ whisperPulseConfig: config }, () => {
        resolve();
      });
    });
  },

  async loadConfig(): Promise<ConfigBundle | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['whisperPulseConfig'], (result) => {
        resolve(result.whisperPulseConfig || null);
      });
    });
  },

  exportConfigJson(config: ConfigBundle): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", \`whisperpulse-config-\${Date.now()}.json\`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  async importConfigFromJsonFile(file: File): Promise<ConfigBundle> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as ConfigBundle;
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }
};`
  },
  {
    path: "extension/directAiClient.ts",
    language: "typescript",
    title: "Módulo 3.4: directAiClient.ts",
    description: "Direct TypeScript API network client sending structured context packages to OpenAI, Groq, or Anthropic.",
    content: `/**
 * Direct AI Client supporting OpenAI, Groq, Anthropic with Bring-Your-Own-Key (BYOK)
 */

import { ContextPacket, DictationMode } from '../types';

export class DirectAiClient {
  
  static async processDictation(
    audioBlob: Blob | null,
    transcriptText: string,
    mode: DictationMode,
    contextPacket: ContextPacket,
    apiKey: string,
    provider: 'openai' | 'groq' | 'anthropic' = 'groq'
  ): Promise<string> {
    
    // Construct rich prompt with 4 context variables
    const prompt = \`
=== CONTEXT PACKET ===
1. User Message (Raw Speech): \${transcriptText}
2. Application Context: App: \${contextPacket.applicationContext.appName} | Focused Field: "\${contextPacket.applicationContext.focusedFieldContent}"
3. Selected Text: "\${contextPacket.selectedText}"
4. Clipboard Context: "\${contextPacket.clipboardContext}"
======================

Task: Follow the system instructions and mode rules to transform the User Message into the final output text.
\`;

    if (provider === 'groq') {
      return await this.callGroq(prompt, mode, apiKey);
    } else if (provider === 'openai') {
      return await this.callOpenAI(prompt, mode, apiKey);
    } else {
      return await this.callAnthropic(prompt, mode, apiKey);
    }
  }

  private static async callGroq(prompt: string, mode: DictationMode, apiKey: string): Promise<string> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${apiKey}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: mode.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: mode.temperature,
        max_tokens: mode.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(\`Groq API Error: \${response.statusText}\`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private static async callOpenAI(prompt: string, mode: DictationMode, apiKey: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${apiKey}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: mode.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: mode.temperature,
        max_tokens: mode.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(\`OpenAI API Error: \${response.statusText}\`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private static async callAnthropic(prompt: string, mode: DictationMode, apiKey: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        system: mode.systemPrompt,
        messages: [{ role: "user", content: prompt }],
        max_tokens: mode.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(\`Anthropic API Error: \${response.statusText}\`);
    }

    const data = await response.json();
    return data.content[0]?.text || "";
  }
}
`
  }
];

export const codeModules = codeModuleFiles;
