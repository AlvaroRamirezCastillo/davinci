import { Component, computed, inject, signal } from '@angular/core';
import { ComponentDocsService } from '../../services/component-docs.service';
import { CanvasComponentRenderer } from './components/canvas-component-renderer/canvas-component-renderer';
import { PropertiesPanel } from './components/properties-panel/properties-panel';

interface CanvasComponent {
  id: number;
  tag: string;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  properties: CanvasComponentProperties;
}

export interface CanvasComponentProperties {
  [key: string]: string;
}

interface ResizeState {
  componentId: number;
  startClientX: number;
  startClientY: number;
  startColumnSpan: number;
  startRowSpan: number;
  columnWidth: number;
  rowHeight: number;
}

const componentDragType = 'application/x-davinci-component-tag';
const componentMoveType = 'application/x-davinci-canvas-component-id';
const gridColumns = 12;
const gridRows = 24;
const defaultColumnSpan = 3;
const defaultRowSpan = 2;
const minColumnSpan = 1;
const minRowSpan = 1;

@Component({
  selector: 'app-design-canvas',
  imports: [CanvasComponentRenderer, PropertiesPanel],
  templateUrl: './design-canvas.html',
  styleUrl: './design-canvas.scss',
})
export class DesignCanvas {
  private readonly componentDocs = inject(ComponentDocsService);

  protected readonly gridCells = Array.from({ length: gridRows * gridColumns });
  protected readonly components = signal<CanvasComponent[]>([]);
  protected readonly isDraggingOver = signal(false);
  protected readonly selectedComponentId = signal<number | null>(null);
  protected readonly hasComponents = computed(() => this.components().length > 0);
  protected readonly selectedComponent = computed(
    () => this.components().find((component) => component.id === this.selectedComponentId()) ?? null,
  );

  private nextId = 1;
  private resizeState: ResizeState | null = null;

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
        properties: this.defaultProperties(tag),
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

  protected onEditPropertiesClick(event: MouseEvent, component: CanvasComponent): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedComponentId.set(component.id);
  }

  protected onDeleteComponentClick(event: MouseEvent, component: CanvasComponent): void {
    event.preventDefault();
    event.stopPropagation();

    this.components.update((components) => components.filter((currentComponent) => currentComponent.id !== component.id));

    if (this.selectedComponentId() === component.id) {
      this.closePropertiesPanel();
    }
  }

  protected onPropertiesChanged(properties: CanvasComponentProperties): void {
    const selectedComponentId = this.selectedComponentId();

    if (!selectedComponentId) {
      return;
    }

    this.components.update((components) =>
      components.map((component) => (component.id === selectedComponentId ? { ...component, properties } : component)),
    );
  }

  protected onComponentPropertyChanged(componentId: number, propertyName: string, value: string): void {
    this.components.update((components) =>
      components.map((component) =>
        component.id === componentId
          ? {
              ...component,
              properties: {
                ...component.properties,
                [propertyName]: value,
              },
            }
          : component,
      ),
    );
  }

  protected closePropertiesPanel(): void {
    this.selectedComponentId.set(null);
  }

  protected componentGridColumn(component: CanvasComponent): string {
    return `${component.column} / span ${component.columnSpan}`;
  }

  protected componentGridRow(component: CanvasComponent): string {
    return `${component.row} / span ${component.rowSpan}`;
  }

  protected onResizeStart(event: PointerEvent, component: CanvasComponent): void {
    event.preventDefault();
    event.stopPropagation();

    const surface = (event.currentTarget as HTMLElement).closest('.design-canvas__surface') as HTMLElement | null;

    if (!surface) {
      return;
    }

    const metrics = this.gridMetrics(surface);
    this.resizeState = {
      componentId: component.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startColumnSpan: component.columnSpan,
      startRowSpan: component.rowSpan,
      columnWidth: metrics.columnWidth,
      rowHeight: metrics.rowHeight,
    };

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onResizeMove(event: PointerEvent, component: CanvasComponent): void {
    if (!this.resizeState || this.resizeState.componentId !== component.id) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const columnDelta = Math.round((event.clientX - this.resizeState.startClientX) / this.resizeState.columnWidth);
    const rowDelta = Math.round((event.clientY - this.resizeState.startClientY) / this.resizeState.rowHeight);
    const maxColumnSpan = gridColumns - component.column + 1;
    const maxRowSpan = gridRows - component.row + 1;

    this.setComponentSpan(
      component.id,
      this.clamp(this.resizeState.startColumnSpan + columnDelta, minColumnSpan, maxColumnSpan),
      this.clamp(this.resizeState.startRowSpan + rowDelta, minRowSpan, maxRowSpan),
    );
  }

  protected onResizeEnd(event: PointerEvent): void {
    if (!this.resizeState) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.resizeState = null;
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
    const metrics = this.gridMetrics(surface);
    const x = event.clientX - metrics.rect.left - metrics.paddingLeft;
    const y = event.clientY - metrics.rect.top - metrics.paddingTop;

    return {
      column: this.clamp(Math.floor(x / metrics.columnWidth) + 1, 1, gridColumns),
      row: this.clamp(Math.floor(y / metrics.rowHeight) + 1, 1, gridRows),
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

  private setComponentSpan(componentId: number, columnSpan: number, rowSpan: number): void {
    this.components.update((components) =>
      components.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const maxColumnSpan = gridColumns - component.column + 1;

        return {
          ...component,
          columnSpan: this.clamp(columnSpan, minColumnSpan, maxColumnSpan),
          rowSpan: this.clamp(rowSpan, minRowSpan, gridRows - component.row + 1),
        };
      }),
    );
  }

  private defaultProperties(tag: string): CanvasComponentProperties {
    return this.componentDocs.defaultProperties(tag);
  }

  private gridMetrics(surface: HTMLElement): {
    rect: DOMRect;
    paddingLeft: number;
    paddingTop: number;
    columnWidth: number;
    rowHeight: number;
  } {
    const rect = surface.getBoundingClientRect();
    const style = getComputedStyle(surface);
    const paddingLeft = Number.parseFloat(style.paddingLeft);
    const paddingTop = Number.parseFloat(style.paddingTop);
    const contentWidth = rect.width - paddingLeft - Number.parseFloat(style.paddingRight);
    const contentHeight = rect.height - paddingTop - Number.parseFloat(style.paddingBottom);

    return {
      rect,
      paddingLeft,
      paddingTop,
      columnWidth: contentWidth / gridColumns,
      rowHeight: contentHeight / gridRows,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
