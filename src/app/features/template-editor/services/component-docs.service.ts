import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

export interface ComponentPropDoc {
  name: string;
  default?: unknown;
}

export interface ComponentDoc {
  tag: string;
  props?: ComponentPropDoc[];
}

interface DocsResponse {
  components?: ComponentDoc[];
}

@Injectable({
  providedIn: 'root',
})
export class ComponentDocsService {
  private readonly http = inject(HttpClient);
  private readonly componentsState = signal<ComponentDoc[]>([]);
  private readonly isLoadingState = signal(true);
  private readonly hasErrorState = signal(false);

  readonly components = this.componentsState.asReadonly();
  readonly isLoading = this.isLoadingState.asReadonly();
  readonly hasError = this.hasErrorState.asReadonly();

  constructor() {
    this.http.get<DocsResponse>('/docs.json').subscribe({
      next: (docs) => {
        this.componentsState.set(docs.components ?? []);
        this.isLoadingState.set(false);
      },
      error: () => {
        this.hasErrorState.set(true);
        this.isLoadingState.set(false);
      },
    });
  }

  component(tag: string): ComponentDoc | null {
    return this.components().find((component) => component.tag === tag) ?? null;
  }

  defaultProperties(tag: string): Record<string, string> {
    const componentDoc = this.component(tag);

    if (!componentDoc?.props?.length) {
      return {};
    }

    return componentDoc.props.reduce<Record<string, string>>((properties, prop) => {
      properties[prop.name] = this.defaultValue(prop.default);

      return properties;
    }, {});
  }

  private defaultValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    const stringValue = String(value);
    const quotedStringMatch = stringValue.match(/^(['"])(.*)\1$/);

    return quotedStringMatch?.[2] ?? stringValue;
  }
}
