# Экспорт подвала из Blender в GLB

Исходник: `models/basement/Basement.blend`.
Игровой файл: `public/models/basement/basement.glb`.

Откройте **File → Export → glTF 2.0** и выставьте настройки:

| Параметр | Значение | Зачем |
| --- | --- | --- |
| Format | glTF Binary (.glb) | Один файл с геометрией, материалами и текстурами |
| Include → Selected Objects | Выключено | Экспортировать весь подвал, включая лампы и зону |
| Include → Custom Properties | **Включено** | Сохраняет `collision = false` и маркеры `lightId` как glTF extras |
| Transform → +Y Up | Включено | Согласует оси Blender и Three.js |
| Data → Mesh → UVs | Включено | Сохраняет координаты текстур |
| Data → Mesh → Normals | Включено | Сохраняет нормали для освещения |
| Materials | Export | Сохраняет материалы и прозрачность |
| Vertex Colors | Material | Экспортирует цветовой атрибут, используемый материалом зоны |
| All Vertex Colors | Включено | Сохраняет RGBA атрибут `Color` с градиентом альфы |
| Animation | Выключено для подвала | Статической сцене анимации не нужны |
| Draco Compression | Выключено | В загрузчике проекта не настроен Draco-декодер |

Названия разделов могут отличаться между версиями Blender. Эти настройки проверены экспортом из Blender 5.2.1. Для модели игрока анимации должны быть включены.
