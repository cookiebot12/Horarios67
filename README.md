# Generador de Horarios

Aplicación web para crear, personalizar y exportar horarios académicos, construida con React, Vite y Tailwind CSS, siguiendo las directrices de interfaz de Apple (HIG).

## Instalación y uso local

```bash
npm install
npm run dev
```
## Build de producción
```bash
npm run build
npm run preview
```
El resultado queda en la carpeta `dist/`.

## Despliegue en Vercel

1. Sube este proyecto a un repositorio de GitHub.
2. En Vercel, importa el repositorio.
3. Framework preset: **Vite**. Comando de build: `npm run build`. Directorio de salida: `dist`.
4. Despliega.

## Estructura del proyecto

```
src/
├── App.jsx                     # Composición principal de la app
├── main.jsx                    # Punto de entrada
├── index.css                   # Estilos globales y tokens
├── hooks/
│   └── useSchedule.js          # Estado: días, materias, bloques, config
├── components/
│   ├── Sidebar.jsx             # Panel lateral de configuración
│   ├── TimeRangeControl.jsx    # Rango de horas visible
│   ├── IntervalControl.jsx     # Selector de intervalos (30/45/60 min)
│   ├── SubjectCreator.jsx      # Alta de materias + lista arrastrable
│   ├── ColorPicker.jsx         # Selector de color con paleta y recientes
│   ├── AspectRatioControl.jsx  # Formato del lienzo (16:9, 9:16, 4:3)
│   ├── StyleToggle.jsx         # Toggle de bordes rectos/redondeados
│   ├── ScheduleGrid.jsx        # Grid del horario + drag & drop
│   ├── SubjectBlock.jsx        # Bloque de materia colocado en el grid
│   └── DownloadMenu.jsx        # Exportación a PNG / JPG / AVIF
└── utils/
    ├── timeUtils.js            # Conversión y generación de franjas horarias
    ├── colorUtils.js           # Paleta y contraste de texto
    ├── exportUtils.js          # Exportación de imagen con html2canvas
    └── id.js                   # Generador de IDs
```

## Funcionalidades

- Días de la semana dinámicos: agregar, eliminar y renombrar (clic sobre el encabezado).
- Franja horaria e intervalos configurables (30, 45 o 60 min); el grid se recalcula al instante.
- Creación de materias con nombre y color (paleta predefinida, color personalizado y colores recientes).
- Arrastrar materias desde el panel al horario, con ajuste automático a la cuadrícula (snap to grid) y bloqueo de superposiciones.
- Bloques movibles (arrastrar) y redimensionables (borde inferior).
- Formatos de lienzo: 16:9, 9:16 y 4:3.
- Descarga en PNG, JPG o AVIF (con respaldo automático a PNG si el navegador no soporta AVIF).
- Toggle para alternar entre bordes rectos y redondeados en los bloques.

## Notas técnicas

- El soporte de codificación AVIF vía `canvas.toBlob` depende del navegador; Chrome y Edge recientes lo soportan. Si no está disponible, la app exporta automáticamente en PNG y lo notifica.
- El drag & drop usa la API nativa de HTML5 (sin librerías externas).
