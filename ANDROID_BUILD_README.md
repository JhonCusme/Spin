# 🏗️ Compilación de SpinDraw para Android

Esta guía te ayudará a compilar la aplicación SpinDraw para dispositivos Android usando Capacitor.

## 📋 Requisitos Previos

### 1. Android Studio
- Descarga e instala [Android Studio](https://developer.android.com/studio)
- Asegúrate de que el SDK de Android esté instalado (API 21+)

### 2. Java JDK
- Instala Java JDK 11 o superior
- Verifica con: `java -version`

### 3. Node.js y npm
- Node.js 14+ y npm (ya instalado en el proyecto)

## 🚀 Pasos para Compilar

### Opción 1: Script Automático (Recomendado)

```powershell
# Ejecuta el script de compilación
.\build-android.ps1
```

### Opción 2: Pasos Manuales

1. **Sincronizar archivos:**
   ```bash
   npx cap sync android
   ```

2. **Abrir Android Studio:**
   ```bash
   npx cap open android
   ```

3. **En Android Studio:**
   - Espera a que Gradle termine de sincronizar
   - Ve a **Build > Build Bundle(s)/APK(s) > Build APK(s)**
   - El APK se generará en: `android/app/build/outputs/apk/debug/`

## 📱 Instalación del APK

1. Transfiere el archivo `.apk` a tu dispositivo Android
2. En el dispositivo, ve a **Configuración > Seguridad**
3. Habilita "Instalación de aplicaciones desconocidas"
4. Abre el archivo APK y sigue las instrucciones

## 🔧 Configuración Adicional

### Cambiar el Nombre de la App
Edita `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">SpinDraw</string>
<string name="title_activity_main">SpinDraw</string>
```

### Cambiar el Icono
Reemplaza los archivos en `android/app/src/main/res/drawable-*/` con tus iconos.

### Cambiar el Package Name
Edita `android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId "com.spindraw.app"
    // ...
}
```

## 🐛 Solución de Problemas

### Error de Gradle Sync
- Limpia el caché: **File > Invalidate Caches / Restart**
- Rebuild: **Build > Rebuild Project**

### Error de SDK
- En Android Studio: **Tools > SDK Manager**
- Instala las APIs faltantes

### Error de Java
- Verifica que JAVA_HOME esté configurado correctamente
- Usa JDK 11 o 17

## 📋 Características de la App Android

- ✅ Funciona sin conexión a internet
- ✅ Notificaciones push (si se configura)
- ✅ Acceso a cámara y galería
- ✅ Almacenamiento local persistente
- ✅ Interfaz nativa de Android

## 🔄 Actualizaciones

Para actualizar la app:

1. Haz cambios en el código web
2. Sincroniza: `npx cap sync android`
3. Rebuild en Android Studio
4. Reinstala el APK en el dispositivo

## 📞 Soporte

Si tienes problemas, verifica:
- [Documentación de Capacitor](https://capacitorjs.com/docs)
- [Guía de Android Studio](https://developer.android.com/studio/intro)

---

¡Tu app SpinDraw está lista para Android! 🎉</content>
</xai:function_call">Crear documentación completa para compilar la app Android