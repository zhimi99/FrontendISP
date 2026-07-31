import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { IconComponent } from '../../shared/icon';

/** Pantalla temporal para los módulos aún no diseñados. */
@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="ph">
      <div class="ph-ico"><app-icon [name]="icono" [size]="30" /></div>
      <h2>{{ titulo }}</h2>
      <p>Este módulo aún no está diseñado. Empezamos por <strong>Clientes</strong>.</p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .ph {
        max-width: 480px;
        margin: 90px auto;
        text-align: center;
        padding: 0 20px;
      }
      .ph-ico {
        width: 74px;
        height: 74px;
        border-radius: 20px;
        margin: 0 auto 20px;
        display: grid;
        place-items: center;
        background: var(--brand-soft);
        color: var(--brand-700);
      }
      h2 {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      p {
        color: var(--muted);
        font-size: 14px;
      }
    `,
  ],
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  titulo = 'Módulo';
  icono = 'box';

  constructor() {
    const data = this.route.snapshot.data;
    this.titulo = data['titulo'] ?? 'Módulo';
    this.icono = data['icono'] ?? 'box';
  }
}
