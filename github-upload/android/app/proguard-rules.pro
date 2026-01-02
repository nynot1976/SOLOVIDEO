# SoloVideoClub ProGuard Rules

# Mantener todas las clases de Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }

# Mantener WebView y JavaScript
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Mantener clases de video y streaming
-keep class android.media.** { *; }
-keep class androidx.media.** { *; }

# Mantener clases de networking
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }

# No ofuscar nombres de métodos llamados desde JavaScript
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}

# Mantener enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Mantener Parcelables
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Mantener clases de serialización JSON
-keep class com.google.gson.** { *; }
-keep class org.json.** { *; }

# Optimizaciones específicas para video streaming
-keep class android.webkit.WebView { *; }
-keep class android.webkit.WebViewClient { *; }
-keep class android.webkit.WebChromeClient { *; }

# Mantener todas las Activity y Service
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Configuraciones para release
-dontobfuscate
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# Logs - remover en release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}