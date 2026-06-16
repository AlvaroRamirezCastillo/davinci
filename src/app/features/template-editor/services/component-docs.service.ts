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

  defaultProperties(tag: string): Record<string, string> {
    const componentDoc = this.components().find((component) => component.tag === tag);

    if (!componentDoc?.props?.length) {
      return {};
    }

    return componentDoc.props.reduce<Record<string, string>>((properties, prop) => {
      properties[prop.name] = prop.default === undefined || prop.default === null ? '' : String(prop.default);

      return properties;
    }, {});
  }
}
