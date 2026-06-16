import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/template-editor/template-editor').then(
        (m) => m.TemplateEditor,
      ),
  },
];
