import { Injectable, inject } from '@angular/core';
import { ComponentDoc, ComponentDocsService } from './component-docs.service';

@Injectable({
  providedIn: 'root',
})
export class ComponentRegistryService {
  private readonly componentDocs = inject(ComponentDocsService);

  getComponent(tag: string): ComponentDoc | null {
    return this.componentDocs.component(tag);
  }
}
