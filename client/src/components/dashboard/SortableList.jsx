import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// A vertical list whose items can be reordered by dragging a handle (dnd-kit).
// Keyboard users: focus a handle, press Space to pick the item up, arrow keys to move it,
// Space again to drop it (Esc cancels).
//
//   <SortableList items={list} getId={(item) => item._id} onReorder={setList}
//     renderItem={(item, index, handle) => <Row ... handle={handle} />} />
function SortableList({ items, getId, onReorder, renderItem, label }) {
  const sensors = useSensors(
    // Only start dragging after the pointer moves 5px, so plain clicks still work
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = items.map(getId);

  // When an item is dropped onto another item's place, move it there
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(items, ids.indexOf(active.id), ids.indexOf(over.id)));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol aria-label={label} className="space-y-2">
          {items.map((item, index) => (
            <SortableItem key={ids[index]} id={ids[index]}>
              {(handle) => renderItem(item, index, handle)}
            </SortableItem>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, children }) {
  // useSortable gives the props that make this item draggable and animate it while moving
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'relative z-10 opacity-90 shadow-xl' : ''}>
      {children({ ...attributes, ...listeners })}
    </li>
  );
}

// The grip button that starts a drag. Spread the `handle` props from renderItem onto it.
export function DragHandle({ handle, label }) {
  return (
    <button
      type="button"
      {...handle}
      aria-label={label}
      className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-ink-subtle hover:text-ink active:cursor-grabbing"
    >
      <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">
        {[3, 9, 15].map((y) => (
          <g key={y}>
            <circle cx="3" cy={y} r="1.5" />
            <circle cx="9" cy={y} r="1.5" />
          </g>
        ))}
      </svg>
    </button>
  );
}

export default SortableList;
