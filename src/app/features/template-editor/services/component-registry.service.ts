import { Injectable, Type } from '@angular/core';
import { AppBox } from '../../../shared/components/app-box/app-box';
import { AppInput } from '../../../shared/components/app-input/app-input';

@Injectable({
  providedIn: 'root',
})
export class ComponentRegistryService {
  private readonly components = new Map<string, Type<unknown>>([
    ['app-box', AppBox],
    ['app-input', AppInput],
  ]);

  getComponent(tag: string): Type<unknown> | null {
    return this.components.get(tag) ?? null;
  }
}
