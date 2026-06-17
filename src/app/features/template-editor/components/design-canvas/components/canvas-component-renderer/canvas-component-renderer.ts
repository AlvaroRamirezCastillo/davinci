import {
  Component,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { ComponentRegistryService } from '../../../../services/component-registry.service';
import type { CanvasComponentProperties } from '../../design-canvas';

@Component({
  selector: 'app-canvas-component-renderer',
  imports: [],
  templateUrl: './canvas-component-renderer.html',
  styleUrl: './canvas-component-renderer.scss',
})
export class CanvasComponentRenderer implements OnDestroy {
  private readonly componentRegistry = inject(ComponentRegistryService);
  private readonly viewContainer = viewChild('componentHost', { read: ViewContainerRef });

  readonly tag = input.required<string>();
  readonly properties = input.required<CanvasComponentProperties>();
  readonly propertyChange = output<{ propertyName: string; value: string }>();

  private element: HTMLElement | null = null;
  private renderedTag: string | null = null;
  private unsupportedElement: HTMLElement | null = null;
  private outputSubscriptions: Array<() => void> = [];

  constructor() {
    effect(() => {
      const tag = this.tag();
      const properties = this.properties();
      const viewContainer = this.viewContainer();

      if (!viewContainer) {
        return;
      }

      const didRender = this.renderComponent(tag);
      this.applyInputs(properties);

      if (didRender) {
        this.bindOutputs(properties);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearOutputSubscriptions();
    this.clearUnsupportedElement();
    this.clearElement();
  }

  private renderComponent(tag: string): boolean {
    const componentDoc = this.componentRegistry.getComponent(tag);

    if (this.renderedTag === tag && (this.element || !componentDoc)) {
      return false;
    }

    const viewContainer = this.viewContainer();

    if (!viewContainer) {
      return false;
    }

    this.clearOutputSubscriptions();
    this.clearUnsupportedElement();
    this.clearElement();
    viewContainer.clear();
    this.element = null;
    this.renderedTag = tag;

    if (!componentDoc) {
      const unsupportedElement = document.createElement('div');
      unsupportedElement.className = 'canvas-component-renderer__unsupported';
      unsupportedElement.textContent = tag;
      this.unsupportedElement = unsupportedElement;
      viewContainer.element.nativeElement.parentElement?.appendChild(unsupportedElement);
      return true;
    }

    const element = document.createElement(componentDoc.tag);
    element.classList.add('canvas-component-renderer__element');
    this.element = element;
    viewContainer.element.nativeElement.parentElement?.appendChild(element);

    return true;
  }

  private applyInputs(properties: CanvasComponentProperties): void {
    if (!this.element) {
      return;
    }

    for (const [propertyName, value] of Object.entries(properties)) {
      (this.element as unknown as Record<string, unknown>)[propertyName] = value;
      this.element.setAttribute(this.toKebabCase(propertyName), value);
    }
  }

  private bindOutputs(properties: CanvasComponentProperties): void {
    if (!this.element) {
      return;
    }

    for (const propertyName of Object.keys(properties)) {
      const eventNames = [`${propertyName}Changed`, `${propertyName}Change`];

      if (propertyName === 'value') {
        eventNames.push('change', 'input');
      }

      for (const eventName of eventNames) {
        const listener = (event: Event) => {
          const value = this.eventValue(event, propertyName);
          this.propertyChange.emit({
            propertyName,
            value,
          });
        };

        this.element.addEventListener(eventName, listener);
        this.outputSubscriptions.push(() => this.element?.removeEventListener(eventName, listener));
      }
    }
  }

  private clearOutputSubscriptions(): void {
    for (const unsubscribe of this.outputSubscriptions) {
      unsubscribe();
    }

    this.outputSubscriptions = [];
  }

  private clearUnsupportedElement(): void {
    this.unsupportedElement?.remove();
    this.unsupportedElement = null;
  }

  private clearElement(): void {
    this.element?.remove();
    this.element = null;
  }

  private eventValue(event: Event, propertyName: string): string {
    const customEvent = event as CustomEvent<unknown>;
    const detail = customEvent.detail;

    if (detail && typeof detail === 'object' && propertyName in detail) {
      const value = (detail as Record<string, unknown>)[propertyName];

      return value === undefined || value === null ? '' : String(value);
    }

    if (detail !== undefined && detail !== null && typeof detail !== 'object') {
      return String(detail);
    }

    const targetValue = (event.target as { value?: unknown } | null)?.value;

    return targetValue === undefined || targetValue === null ? '' : String(targetValue);
  }

  private toKebabCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
}
