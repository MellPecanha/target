import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, Commission, InterestResult, Product } from './api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  active: 'commissions' | 'inventory' | 'interest' = 'commissions';
  commissions: Commission[] = [];
  products: Product[] = [];
  interestResult?: InterestResult;
  message = '';
  loading = false;
  readonly movementForm = this.fb.nonNullable.group({ productCode: [101, Validators.required], type: ['ENTRY' as 'ENTRY' | 'EXIT', Validators.required], quantity: [1, [Validators.required, Validators.min(1)]], description: ['', Validators.required] });
  readonly interestForm = this.fb.nonNullable.group({ amount: [100, [Validators.required, Validators.min(0.01)]], dueDate: ['', Validators.required] });

  constructor(private readonly api: ApiService, private readonly fb: FormBuilder) {}
  ngOnInit() { this.loadCommissions(); this.loadInventory(); }
  select(tab: typeof this.active) { this.active = tab; this.message = ''; }
  loadCommissions() { this.api.commissions().subscribe({ next: data => this.commissions = data, error: () => this.message = 'Não foi possível conectar à API Node na porta 3000.' }); }
  loadInventory() { this.api.inventory().subscribe({ next: data => this.products = data, error: () => this.message = 'Não foi possível carregar o estoque.' }); }
  submitMovement() {
    if (this.movementForm.invalid) return this.movementForm.markAllAsTouched();
    this.loading = true; this.message = '';
    this.api.move(this.movementForm.getRawValue()).subscribe({
      next: (result: any) => { this.message = `Movimentação ${result.id.slice(0, 8)} registrada. Estoque final: ${result.finalStock}.`; this.movementForm.patchValue({ quantity: 1, description: '' }); this.loadInventory(); this.loading = false; },
      error: error => { this.message = error.error?.message ?? 'Não foi possível registrar a movimentação.'; this.loading = false; }
    });
  }
  calculateInterest() {
    if (this.interestForm.invalid) return this.interestForm.markAllAsTouched();
    this.api.interest(this.interestForm.getRawValue()).subscribe({ next: result => this.interestResult = result, error: error => this.message = error.error?.message ?? 'Não foi possível calcular os juros.' });
  }
}
