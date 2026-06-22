import { Component, computed, effect, input, output, signal } from '@angular/core';
import type { CanvasComponentProperties, DataContext } from '../../design-canvas';

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

interface DataContextPath {
  path: string;
  value: unknown;
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
  readonly dataContext = input.required<DataContext>();
  readonly propertiesChange = output<CanvasComponentProperties>();
  readonly dataContextChange = output<DataContext>();
  readonly closePanel = output<void>();

  protected readonly position = signal({ x: 32, y: 32 });
  protected readonly dataContextDraft = signal('{}');
  protected readonly dataContextError = signal('');
  protected readonly dataContextPaths = computed(() => this.collectPaths(this.dataContext()));
  protected readonly propertyEntries = computed(() =>
    Object.entries(this.properties()).map(([name, property]) => ({
      name,
      value: property.value,
      binding: property.binding,
    })),
  );

  private dragState: DragState | null = null;

  constructor() {
    effect(() => {
      const formattedDataContext = JSON.stringify(this.dataContext(), null, 2);

      if (this.dataContextError() || this.dataContextDraft() === formattedDataContext) {
        return;
      }

      this.dataContextDraft.set(formattedDataContext);
    });
  }

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
      [propertyName]: {
        ...this.properties()[propertyName],
        value,
      },
    });
  }

  protected propertySource(propertyName: string): 'literal' | 'dataContext' {
    return this.properties()[propertyName]?.binding ? 'dataContext' : 'literal';
  }

  protected onPropertySourceChange(propertyName: string, event: Event): void {
    const source = (event.target as HTMLSelectElement).value;
    const property = this.properties()[propertyName];

    if (source === 'literal') {
      const { binding: _binding, ...literalProperty } = property;
      this.propertiesChange.emit({
        ...this.properties(),
        [propertyName]: literalProperty,
      });
      return;
    }

    const path = this.dataContextPaths()[0]?.path;

    if (!path) {
      return;
    }

    this.setBinding(propertyName, path);
  }

  protected onBindingPathChange(propertyName: string, event: Event): void {
    this.setBinding(propertyName, (event.target as HTMLSelectElement).value);
  }

  protected selectedPath(propertyName: string): string {
    return this.properties()[propertyName]?.binding?.replace(/^\$dataContext\.?/, '') ?? '';
  }

  protected onDataContextInput(event: Event): void {
    const draft = (event.target as HTMLTextAreaElement).value;
    this.dataContextDraft.set(draft);

    try {
      const parsedDataContext: unknown = JSON.parse(draft);

      if (
        parsedDataContext === null ||
        typeof parsedDataContext !== 'object' ||
        Array.isArray(parsedDataContext)
      ) {
        this.dataContextError.set('El data context debe ser un objeto JSON.');
        return;
      }

      this.dataContextError.set('');
      this.dataContextChange.emit(parsedDataContext as DataContext);
    } catch {
      this.dataContextError.set('JSON inválido.');
    }
  }

  protected pathValuePreview(path: DataContextPath): string {
    if (typeof path.value === 'string') {
      return path.value;
    }

    const serializedValue = JSON.stringify(path.value);
    return serializedValue === undefined ? String(path.value) : serializedValue;
  }

  protected bindingPreview(propertyName: string): string {
    return this.properties()[propertyName]?.binding ?? '';
  }

  protected onCloseClick(event: MouseEvent): void {
    event.stopPropagation();
    this.closePanel.emit();
  }

  private setBinding(propertyName: string, path: string): void {
    if (!path) {
      return;
    }

    const normalizedPath = path
      .trim()
      .replace(/^\.+|\.+$/g, '')
      .replace(/\s+/g, '');

    this.propertiesChange.emit({
      ...this.properties(),
      [propertyName]: {
        ...this.properties()[propertyName],
        binding: `$dataContext.${normalizedPath}`,
      },
    });
  }

  private collectPaths(value: unknown, parentPath = ''): DataContextPath[] {
    if (value === null || typeof value !== 'object') {
      return parentPath ? [{ path: parentPath, value }] : [];
    }

    return Object.entries(value).flatMap(([key, childValue]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const currentPath = { path, value: childValue };

      if (childValue === null || typeof childValue !== 'object') {
        return [currentPath];
      }

      return [currentPath, ...this.collectPaths(childValue, path)];
    });
  }
}
