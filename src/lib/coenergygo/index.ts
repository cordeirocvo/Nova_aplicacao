/**
 * CoenergyGO — Mobilidade Elétrica Inteligente & Engenharia Normativa
 * Cordeiro Energia
 * 
 * Fachada principal da biblioteca de cálculo e conformidade regulatória.
 */

export * from './types';
export * from './database/vehicles';
export * from './database/utilities';
export * from './engines/cemigEngine';
export * from './engines/cpflEngine';
export * from './engines/energisaEngine';
export * from './engines/nbr17019Engine';
export * from './database/typicalLoadProfiles';
export * from './engines/loadCurveEngine';
export * from './engines/dlmEngine';
export * from './parsers/loadFileParser';
export * from './engines/infrastructureEngine';

import { UtilitySizingInput, UtilitySizingOutput } from './types';
import { evaluateCEMIG } from './engines/cemigEngine';
import { evaluateCPFL } from './engines/cpflEngine';
import { evaluateEnergisa } from './engines/energisaEngine';

/**
 * Função unificada de despacho para análise da concessionária escolhida
 */
export function evaluateUtility(input: UtilitySizingInput): UtilitySizingOutput {
  switch (input.utility) {
    case 'CEMIG':
      return evaluateCEMIG(input);
    case 'CPFL':
      return evaluateCPFL(input);
    case 'ENERGISA':
      return evaluateEnergisa(input);
    case 'ENEL_SP':
    case 'ENEL_RJ':
    default:
      // Para Enel, utiliza as diretrizes equivalentes
      return evaluateCPFL(input);
  }
}
