# Generador de Horarios

Aplicación web para crear, personalizar y exportar horarios académicos, construida con React, Vite y Tailwind CSS, siguiendo las directrices de interfaz de Apple (HIG).

_Última actualización: 2026-08-03_

## Estructura del proyecto

```
scripts/
└── generate-icons.mjs          # Generador de íconos (solo builtins de Node)

public/
├── favicon.svg                 # Marca "Z" (fuente vectorial)
├── favicon.ico                 # 16/32/48 con payload PNG
├── apple-touch-icon.png        # 180×180
├── icon-192.png                # PWA
├── icon-512.png                # PWA
├── icon-maskable-512.png       # PWA, zona segura del 22 %
└── manifest.json               # Web App Manifest

src/
├── App.jsx                     # Composición principal de la app
├── main.jsx                    # Punto de entrada
├── index.css                   # Estilos globales y tokens
├── hooks/
│   ├── useSchedule.js          # Estado: días, materias, bloques, config
│   └── useFontEpoch.js         # Invalida las medidas al cargar/cambiar la fuente
├── components/
│   ├── Sidebar.jsx             # Panel lateral de configuración
│   ├── TimeRangeControl.jsx    # Rango de horas visible
│   ├── IntervalControl.jsx     # Selector de intervalos (30/60 min)
│   ├── SubjectCreator.jsx      # Alta de materias + lista arrastrable
│   ├── ColorPicker.jsx         # Selector de color con paleta y recientes
│   ├── SettingsMenu.jsx        # Menú de ajustes de la barra superior
│   ├── AspectRatioControl.jsx  # Formato del lienzo (16:9, 32:15, 45:47)
│   ├── StyleToggle.jsx         # Toggle de bordes rectos/redondeados
│   ├── ScheduleGrid.jsx        # Grid del horario, drag & drop y tipografía global
│   ├── SubjectBlock.jsx        # Bloque de materia colocado en el grid
│   ├── BrandMark.jsx           # Logo "Z" en línea (misma geometría que el favicon)
│   └── DownloadMenu.jsx        # Exportación a PNG / JPG / AVIF
└── utils/
    ├── timeUtils.js            # Franjas horarias, subdivisión y snap
    ├── colorUtils.js           # Paletas, contraste y pilas tipográficas
    ├── textMeasure.js          # Medición de texto para el tamaño de fuente global
    ├── exportUtils.js          # Exportación de imagen con html-to-image
    ├── mergeUtils.js           # Fusión de bloques contiguos de la misma materia
    └── id.js                   # Generador de IDs
```

## Funcionalidades

- Días de la semana dinámicos: agregar, eliminar y renombrar (clic sobre el encabezado).
- Franja horaria e intervalos configurables (30 o 60 min); el grid se recalcula al instante.
- **Posicionamiento a media celda**: cada celda admite dos posiciones de inicio, al 0 % y al 50 % de su altura. La subdivisión es siempre `intervalo / 2`, calculada dinámicamente (60 min → marca de 30; 30 min → marca de 15).
- Creación de materias con nombre y color (paleta predefinida, color personalizado y colores recientes).
- Arrastrar materias desde el panel al horario, con bloqueo de superposiciones. Si en el hueco solo cabe media celda, el bloque **se auto-ajusta** a ese tamaño en vez de rechazarse.
- Bloques movibles (arrastrar) y redimensionables (borde inferior), con una **escalera fija de duraciones**: el mínimo de la rejilla y, por encima, solo múltiplos de media hora → `15, 30, 60, 90, 120…`. No existen duraciones de 45 ni 75 min.
- **Tipografía uniforme**: todos los bloques del horario comparten un único tamaño de fuente, el mayor al que la materia más restrictiva (nombre más largo y/o columna más angosta) todavía cabe en una sola línea.
- Color de día aplicado exclusivamente al fondo del encabezado, con contraste automático del texto.
- Formatos de lienzo: 16:9, 32:15 (panorámico) y 45:47 (cuasi-cuadrado).
- Descarga en PNG, JPG o AVIF, a tamaño fijo por formato.
- Instalable como PWA (manifest, íconos 192/512 y variante maskable).

## Tipografía de los bloques

El tamaño de fuente de los bloques es **global y único**, no por bloque:

1. Para cada materia colocada se calcula el mayor tamaño al que su nombre cabe entero en una sola línea dentro del ancho útil del bloque.
2. El tamaño global es el **mínimo** de esos valores, y se aplica a todos los bloques sin excepción.
3. Se recalcula al agregar/quitar bloques o días, al cambiar de formato de lienzo y al cambiar la familia o el peso tipográfico.
4. Pisos: **12px** por defecto y **11px** como piso absoluto, reservado a columnas muy angostas (`< 60px` de ancho útil). Si el texto no cabe ni en el piso, se recorta con elipsis (`…`).
5. El label de hora usa el **85 %** del tamaño global y conserva siempre su espacio: el nombre de la materia nunca lo invade.
6. **Techo**: con nombres cortos ("MATH") el tamaño no crece más allá de lo que permita mostrar la hora entera, ni en ancho (sin `…`) ni en alto (sin perder la línea). Si la opción "Hora en el bloque" está desactivada no hay nada que reservar y el techo vuelve al absoluto de 20px. Los bloques demasiado bajos para alojar la hora ni siquiera en el piso quedan fuera de ese cálculo: ocultan la hora, en vez de arrastrar todo el horario al mínimo.

La medición se hace con `canvas.measureText` a un tamaño de referencia y se escala linealmente, en vez de reducir la fuente por prueba y error leyendo `scrollWidth` en cada paso.

## Duración de los bloques

Las duraciones válidas forman una escalera fija: el **mínimo de la rejilla** (15 min con celdas de 30, 30 min con celdas de 60) y, por encima, **múltiplos de media hora**. Es decir `15, 30, 60, 90, 120…`; el 45 y el 75 quedan fuera por diseño.

- El resize snapea la duración **resultante**, no el incremento. Sumar múltiplos de la subdivisión a la duración de partida heredaba su desalineación y permitía llegar a un `8:00–8:45`.
- El auto-ajuste al colocar respeta la misma escalera: un hueco de 45 min produce un bloque de 30, no de 45.
- Excepción consciente: `mergeContiguousBlocks` fusiona bloques contiguos de la misma materia sumando duraciones, así que dos bloques adyacentes de 15 y 30 min dan 45. Esa duración refleja el tiempo realmente ocupado, y snapearla obligaría a invadir espacio ajeno o a dejar un hueco silencioso.

## Notas técnicas

- La exportación usa **`html-to-image`** (`toCanvas` + `canvas.toBlob` manual). No se usa el `toBlob` de la librería porque en la versión 1.11.x no reenvía `type`/`quality` al paso final y siempre generaría PNG.
- Cada formato exporta a un tamaño fijo, independiente del monitor: **1920×1080** (16:9), **1920×900** (32:15) y **1080×1128** (45:47). Se logra pasando `canvasWidth`/`canvasHeight` junto con `pixelRatio: 1`, ya que `html-to-image` calcula `canvas.width = canvasWidth * pixelRatio`.
- La tarjeta conserva **siempre** la proporción exacta del formato. Su ancho se limita por las tres restricciones a la vez —`min(100%, maxWidth, calc(100cqh * ratio))`— usando unidades de contenedor (`cqh`), que son las únicas que permiten acotar el ancho en función de la altura disponible. La combinación anterior (`w-full` + `max-height: 100%`) recortaba el alto sin encoger el ancho, así que con una ventana baja `aspect-ratio` quedaba anulado.
- Eso importa para la exportación: `toCanvas` dibuja con `drawImage(img, 0, 0, canvasWidth, canvasHeight)`, que **estira** el nodo hasta llenar el lienzo. Si la proporción del nodo no coincide con la pedida, el horario sale **deformado** (hasta un 17 % de estiramiento vertical en el formato cuasi-cuadrado). Por eso se le pasan además las medidas fraccionarias reales del nodo —la librería mide con `clientWidth`/`clientHeight`, que son enteros— y se avisa por consola si la desviación supera el 0,5 %.
- El ancho de columna usado para el cálculo tipográfico se **deriva por aritmética** desde el ancho de la tarjeta, no midiendo una columna de día. Medir una columna haría que la exportación fuese no determinista: al ocultar los controles `.export-hide` las columnas se ensanchan y el `ResizeObserver` competiría con la captura.
- El soporte de codificación AVIF vía `canvas.toBlob` depende del navegador. Si no está disponible, la app exporta automáticamente en PNG y lo notifica.
- El drag & drop usa la API nativa de HTML5 (sin librerías externas).
- Los íconos se generan con `npm run icons`, usando **solo builtins de Node** (`zlib`, `fs`): codificador PNG y contenedor ICO propios, sin dependencias ni red. El script se autoverifica (firma, CRC de cada chunk, dimensiones del IHDR, longitud del flujo de píxeles y coherencia de las entradas del ICO).
- La "Z" se define como geometría (dos barras y una diagonal), no como glifo de texto: un favicon SVG se renderiza en un contexto donde las fuentes web no cargan, así que un `<text>` variaría según la máquina.

## Scripts

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción
npm run preview   # sirve el build
npm run icons     # regenera favicon, apple-touch-icon e íconos PWA
```
