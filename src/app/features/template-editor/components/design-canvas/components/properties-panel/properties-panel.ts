import { Component, computed, input, output, signal } from '@angular/core';
import type { CanvasComponentProperties } from '../../design-canvas';

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

@Component({
  selector: 'app-properties-panel',
  imports: [],
  templateUrl: './properties-panel.html',
  styleUrl: './properties-panel.scss',
})
export class PropertiesPanel {
  readonly componentTag = input.required<string>();
  readonly properties = input.required<CanvasComponentProperties>();
  readonly propertiesChange = output<CanvasComponentProperties>();
  readonly closePanel = output<void>();

  protected readonly position = signal({ x: 32, y: 32 });
  protected readonly propertyEntries = computed(() =>
    Object.entries(this.properties()).map(([key, value]) => ({
      key,
      value,
    })),
  );

  private dragState: DragState | null = null;

  protected panelTransform(): string {
    const position = this.position();

    return `translate3d(${position.x}px, ${position.y}px, 0)`;
  }

  protected onDragStart(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const position = this.position();
    this.dragState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: position.x,
      startY: position.y,
    };

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onDragMove(event: PointerEvent): void {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.position.set({
      x: Math.max(0, this.dragState.startX + event.clientX - this.dragState.startClientX),
      y: Math.max(0, this.dragState.startY + event.clientY - this.dragState.startClientY),
    });
  }

  protected onDragEnd(event: PointerEvent): void {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dragState = null;
  }

  protected onPropertyInput(propertyName: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.propertiesChange.emit({
      ...this.properties(),
      [propertyName]: value,
    });
  }

  protected onCloseClick(event: MouseEvent): void {
    event.stopPropagation();
    this.closePanel.emit();
  }
}
