import {
  Component,
  ComponentRef,
  effect,
  EnvironmentInjector,
  inject,
  input,
  OnDestroy,
  output,
  untracked,
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
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly viewContainer = viewChild('componentHost', { read: ViewContainerRef });

  readonly tag = input.required<string>();
  readonly properties = input.required<CanvasComponentProperties>();
  readonly propertyChange = output<{ propertyName: string; value: string }>();

  private componentRef: ComponentRef<unknown> | null = null;
  private renderedTag: string | null = null;
  private unsupportedElement: HTMLElement | null = null;
  private outputSubscriptions: Array<{ unsubscribe: () => void }> = [];

  constructor() {
    effect(() => {
      const tag = this.tag();
      const properties = this.properties();
      const viewContainer = this.viewContainer();

      if (!viewContainer) {
        return;
      }

      untracked(() => {
        const didRender = this.renderComponent(tag);
        this.applyInputs(properties);

        if (didRender) {
          this.bindOutputs(properties);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.clearOutputSubscriptions();
  }

  private renderComponent(tag: string): boolean {
    if (this.renderedTag === tag) {
      return false;
    }

    const viewContainer = this.viewContainer();

    if (!viewContainer) {
      return false;
    }

    const componentType = this.componentRegistry.getComponent(tag);

    this.clearOutputSubscriptions();
    this.clearUnsupportedElement();
    viewContainer.clear();
    this.componentRef = null;
    this.renderedTag = tag;

    if (!componentType) {
      const unsupportedElement = document.createElement('div');
      unsupportedElement.className = 'canvas-component-renderer__unsupported';
      unsupportedElement.textContent = tag;
      this.unsupportedElement = unsupportedElement;
      viewContainer.element.nativeElement.parentElement?.appendChild(unsupportedElement);
      return true;
    }

    this.componentRef = viewContainer.createComponent(componentType, {
      environmentInjector: this.environmentInjector,
    });

    return true;
  }

  private applyInputs(properties: CanvasComponentProperties): void {
    if (!this.componentRef) {
      return;
    }

    for (const [propertyName, value] of Object.entries(properties)) {
      this.componentRef.setInput(propertyName, value);
    }
  }

  private bindOutputs(properties: CanvasComponentProperties): void {
    if (!this.componentRef) {
      return;
    }

    for (const propertyName of Object.keys(properties)) {
      const outputName = `${propertyName}Changed`;
      const outputRef = (this.componentRef.instance as Record<string, unknown>)[outputName];

      if (!this.isSubscribableOutput(outputRef)) {
        continue;
      }

      this.outputSubscriptions.push(
        outputRef.subscribe((value: unknown) => {
          this.propertyChange.emit({
            propertyName,
            value: value === undefined || value === null ? '' : String(value),
          });
        }),
      );
    }
  }

  private clearOutputSubscriptions(): void {
    for (const subscription of this.outputSubscriptions) {
      subscription.unsubscribe();
    }

    this.outputSubscriptions = [];
  }

  private clearUnsupportedElement(): void {
    this.unsupportedElement?.remove();
    this.unsupportedElement = null;
  }

  private isSubscribableOutput(outputRef: unknown): outputRef is { subscribe: (callback: (value: unknown) => void) => { unsubscribe: () => void } } {
    return (
      typeof outputRef === 'object' &&
      outputRef !== null &&
      'subscribe' in outputRef &&
      typeof (outputRef as { subscribe: unknown }).subscribe === 'function'
    );
  }
}
