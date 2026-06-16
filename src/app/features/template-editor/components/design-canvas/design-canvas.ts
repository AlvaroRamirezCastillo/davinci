import { Component, computed, signal } from '@angular/core';
import { AppBox } from '../../../../shared/components/app-box/app-box';

interface CanvasComponent {
  id: number;
  tag: string;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
}

const componentDragType = 'application/x-picasso-component-tag';
const componentMoveType = 'application/x-picasso-canvas-component-id';
const gridColumns = 12;
const gridRows = 24;
const defaultColumnSpan = 3;
const defaultRowSpan = 2;
const minColumnSpan = 1;
const minRowSpan = 1;

@Component({
  selector: 'app-design-canvas',
  imports: [AppBox],
  templateUrl: './design-canvas.html',
  styleUrl: './design-canvas.scss',
})
export class DesignCanvas {
  protected readonly gridCells = Array.from({ length: gridRows * gridColumns });
  protected readonly components = signal<CanvasComponent[]>([]);
  protected readonly isDraggingOver = signal(false);
  protected readonly hasComponents = computed(() => this.components().length > 0);

  private nextId = 1;

  protected onDragOver(event: DragEvent): void {
    if (!this.canAcceptDrop(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer!.dropEffect = this.isMove(event) ? 'move' : 'copy';
    this.isDraggingOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    const currentTarget = event.currentTarget as HTMLElement | null;
    const relatedTarget = event.relatedTarget as Node | null;

    if (!currentTarget?.contains(relatedTarget)) {
      this.isDraggingOver.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);

    const position = this.dropPosition(event);
    const movedComponentId = Number(event.dataTransfer?.getData(componentMoveType));

    if (movedComponentId) {
      this.moveComponent(movedComponentId, position.column, position.row);
      return;
    }

    const tag = event.dataTransfer?.getData(componentDragType) || event.dataTransfer?.getData('text/plain');

    if (!tag) {
      return;
    }

    this.components.update((components) => [
      ...components,
      {
        id: this.nextId++,
        tag,
        column: position.column,
        row: position.row,
        columnSpan: defaultColumnSpan,
        rowSpan: defaultRowSpan,
      },
    ]);
  }

  protected onComponentDragStart(event: DragEvent, component: CanvasComponent): void {
    event.stopPropagation();
    event.dataTransfer?.setData(componentMoveType, String(component.id));

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected componentGridColumn(component: CanvasComponent): string {
    return `${component.column} / span ${component.columnSpan}`;
  }

  protected componentGridRow(component: CanvasComponent): string {
    return `${component.row} / span ${component.rowSpan}`;
  }

  protected decreaseWidth(componentId: number): void {
    this.resizeComponent(componentId, -1);
  }

  protected increaseWidth(componentId: number): void {
    this.resizeComponent(componentId, 1);
  }

  protected decreaseHeight(componentId: number): void {
    this.resizeComponentRows(componentId, -1);
  }

  protected increaseHeight(componentId: number): void {
    this.resizeComponentRows(componentId, 1);
  }

  private canAcceptDrop(event: DragEvent): boolean {
    const types = Array.from(event.dataTransfer?.types ?? []);

    return types.includes(componentDragType) || types.includes(componentMoveType);
  }

  private isMove(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes(componentMoveType);
  }

  private dropPosition(event: DragEvent): Pick<CanvasComponent, 'column' | 'row'> {
    const surface = event.currentTarget as HTMLElement;
    const rect = surface.getBoundingClientRect();
    const style = getComputedStyle(surface);
    const paddingLeft = Number.parseFloat(style.paddingLeft);
    const paddingTop = Number.parseFloat(style.paddingTop);
    const contentWidth = rect.width - paddingLeft - Number.parseFloat(style.paddingRight);
    const contentHeight = rect.height - paddingTop - Number.parseFloat(style.paddingBottom);
    const columnWidth = contentWidth / gridColumns;
    const rowHeight = contentHeight / gridRows;
    const x = event.clientX - rect.left - paddingLeft;
    const y = event.clientY - rect.top - paddingTop;

    return {
      column: this.clamp(Math.floor(x / columnWidth) + 1, 1, gridColumns),
      row: this.clamp(Math.floor(y / rowHeight) + 1, 1, gridRows),
    };
  }

  private moveComponent(componentId: number, column: number, row: number): void {
    this.components.update((components) =>
      components.map((component) =>
        component.id === componentId
          ? {
              ...component,
              column: this.clamp(column, 1, gridColumns - component.columnSpan + 1),
              row: this.clamp(row, 1, gridRows - component.rowSpan + 1),
            }
          : component,
      ),
    );
  }

  private resizeComponent(componentId: number, sizeDelta: number): void {
    this.components.update((components) =>
      components.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const maxColumnSpan = gridColumns - component.column + 1;

        return {
          ...component,
          columnSpan: this.clamp(component.columnSpan + sizeDelta, minColumnSpan, maxColumnSpan),
        };
      }),
    );
  }

  private resizeComponentRows(componentId: number, sizeDelta: number): void {
    this.components.update((components) =>
      components.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const maxRowSpan = gridRows - component.row + 1;

        return {
          ...component,
          rowSpan: this.clamp(component.rowSpan + sizeDelta, minRowSpan, maxRowSpan),
        };
      }),
    );
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
