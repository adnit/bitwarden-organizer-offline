

# Bitwarden Organizer Offline

Una aplicación web local al 100 %, centrada en la privacidad, para analizar, limpiar y eliminar duplicados de las exportaciones de tu bóveda de Bitwarden.

![Bitwarden Organizer Logo](public/favicon.svg)

## 🛡️ Privacidad en primer lugar
Esta aplicación procesa todos los datos **completamente en tu navegador**. 
- Los datos de tu bóveda nunca abandonan tu computadora.
- Tu Contraseña Maestra solo se utiliza localmente para generar las claves de descifrado.
- Sin seguimiento, sin análisis, sin almacenamiento en la nube.

## ✨ Funcionalidades

- **Descifrado local**: Compatible con exportaciones JSON de Bitwarden protegidas con contraseña (tanto PBKDF2 como Argon2id).
- **Desduplicación inteligente**: Agrupa automáticamente elementos idénticos (mismo dominio, nombre de usuario y contraseña) para fusionarlos en lote.
- **Resolución de conflictos granular**: Resuelve manualmente elementos con dominios coincidentes pero credenciales diferentes. Selecciona campos de distintas versiones para crear la entrada perfecta.
- **Auditoría de seguridad**: Identifica el uso repetido de contraseñas en diferentes cuentas y servicios.
- **Exportación limpia**: Genera un nuevo archivo JSON de Bitwarden limpio, listo para importarse nuevamente a tu bóveda.
- **Interfaz moderna**: Una interfaz premium y responsive construida con Tailwind CSS y Radix UI, con modo oscuro y animaciones fluidas.

## 🚀 Stack Tecnológico

- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI)
- **Criptografía**: 
  - Web Crypto API estándar para AES-CBC y PBKDF2.
  - [hash-wasm](https://github.com/DanHansen/hash-wasm) para Argon2id de alto rendimiento (WebAssembly).
- **Iconos**: [Lucide React](https://lucide.dev/)

## 🛠️ Cómo empezar

### Requisitos previos
- [Node.js](https://nodejs.org/) (se recomienda LTS)
- [npm](https://www.npmjs.com/)

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/adnit/bitwarden-organizer-offline.git
   cd bitwarden-organizer-offline
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Despliegue

El proyecto está configurado para GitHub Pages a través de GitHub Actions.
1. Realiza un push a la rama `master`.
2. El flujo de trabajo en `.github/workflows/main.yml` compilará y desplegará automáticamente.

## 📖 Cómo usarlo

1. **Exportar**: En tu cliente de Bitwarden, ve a Herramientas → Exportar bóveda. Elige **JSON (Cifrado)** y selecciona **Protegido con contraseña**.
2. **Subir**: Arrastra y suelta tu archivo `.json` en esta aplicación.
3. **Desbloquear**: Introduce la contraseña que estableciste durante la exportación.
4. **Limpiar**: 
   - Revisa las **Fusiones automáticas** para eliminar duplicados exactos.
   - Resuelve los **Conflictos** donde las entradas difieren ligeramente.
   - Revisa la **Auditoría de contraseñas** en busca de riesgos de seguridad.
5. **Exportar**: Descarga tu archivo `.json` limpio e impórtalo nuevamente en Bitwarden.

## 📜 Licencia
Licencia MIT - consulta [LICENSE](LICENSE) para más detalles.
