package kr.musicofcity.arduinoscience

import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val url = Uri.parse("https://arduino-project-chi.vercel.app/")
        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(false)
            .setUrlBarHidingEnabled(true)
            .build()

        customTabsIntent.launchUrl(this, url)
        finish()
    }
}
