import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';

interface ComponentDoc {
  tag: string;
}

interface DocsResponse {
  components: ComponentDoc[];
}

const componentDragType = 'application/x-davinci-component-tag';

@Component({
  selector: 'app-component-catalog',
  imports: [],
  templateUrl: './component-catalog.html',
  styleUrl: './component-catalog.scss',
})
export class ComponentCatalog {
  private readonly http = inject(HttpClient);
  protected readonly components = signal<ComponentDoc[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly hasComponents = computed(() => this.components().length > 0);

  constructor() {
    this.http.get<DocsResponse>('/docs.json').subscribe({
      next: (docs) => {
        this.components.set(docs.components ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  protected imagePath(tag: string): string {
    return `/assets/${tag}.png`;
  }

  protected onDragStart(event: DragEvent, tag: string): void {
    event.dataTransfer?.setData(componentDragType, tag);
    event.dataTransfer?.setData('text/plain', tag);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }
}
