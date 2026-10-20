plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "pe.kusi.movil"
    compileSdk { version = release(37) }
    defaultConfig {
        applicationId = "pe.kusi.movil"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "DJANGO_URL", "\"" + providers.gradleProperty("KUSI_DJANGO_URL").getOrElse("http://10.0.2.2:8000") + "\"")
        buildConfigField("String", "EDU_URL", "\"" + providers.gradleProperty("KUSI_EDU_URL").getOrElse("http://10.0.2.2:8080") + "\"")
    }
    buildTypes {
        debug { manifestPlaceholders["traficoLocal"] = "true" }
        release { manifestPlaceholders["traficoLocal"] = "false" }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }
tasks.withType<Test>().configureEach {
    systemProperty("kusi.integracion", providers.gradleProperty("KUSI_INTEGRACION_REAL").getOrElse("false"))
}
dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20250107")
    androidTestImplementation(platform("androidx.compose:compose-bom:2026.09.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
