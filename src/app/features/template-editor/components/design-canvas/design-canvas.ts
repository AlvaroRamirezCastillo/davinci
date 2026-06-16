import { Component, computed, signal } from '@angular/core';

interface CanvasComponent {
  id: number;
  tag: string;
}

const componentDragType = 'application/x-picasso-component-tag';

@Component({
  selector: 'app-design-canvas',
  imports: [],
  templateUrl: './design-canvas.html',
  styleUrl: './design-canvas.scss',
})
export class DesignCanvas {
  protected readonly components = signal<CanvasComponent[]>([]);
  protected readonly isDraggingOver = signal(false);
  protected readonly hasComponents = computed(() => this.components().length > 0);

  private nextId = 1;

  protected onDragOver(event: DragEvent): void {
    if (!this.canAcceptDrop(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
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

    const tag = event.dataTransfer?.getData(componentDragType) || event.dataTransfer?.getData('text/plain');

    if (!tag) {
      return;
    }

    this.components.update((components) => [
      ...components,
      {
        id: this.nextId++,
        tag,
      },
    ]);
  }

  protected imagePath(tag: string): string {
    return `/assets/${tag}.png`;
  }

  private canAcceptDrop(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes(componentDragType);
  }
}
