import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface Commission { seller: string; salesCount: number; salesTotal: number; commissionTotal: number }
export interface Product { productCode: number; description: string; stock: number }
export interface InterestResult { originalAmount: number; dueDate: string; calculationDate: string; daysLate: number; interestAmount: number; totalAmount: number }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly url = environment.apiUrl;
  constructor(private readonly http: HttpClient) {}
  commissions() { return this.http.get<Commission[]>(`${this.url}/commissions`); }
  inventory() { return this.http.get<Product[]>(`${this.url}/inventory`); }
  move(data: { productCode: number; type: 'ENTRY' | 'EXIT'; quantity: number; description: string }) { return this.http.post(`${this.url}/inventory/movements`, data); }
  interest(data: { amount: number; dueDate: string }) { return this.http.post<InterestResult>(`${this.url}/interest/calculate`, data); }
}
