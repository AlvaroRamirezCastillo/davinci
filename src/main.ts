import { bootstrapApplication } from '@angular/platform-browser';
import { defineCustomElement as defineStlBox } from 'stl-components/stl-box';
import { defineCustomElement as defineStlButton } from 'stl-components/stl-button';
import { defineCustomElement as defineStlInput } from 'stl-components/stl-input';
import { defineCustomElement as defineStlSelect } from 'stl-components/stl-select';
import { appConfig } from './app/app.config';
import { App } from './app/app';

defineStlBox();
defineStlButton();
defineStlInput();
defineStlSelect();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
