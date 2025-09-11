import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LongitudinalUtilsService {
  filterTableName(longitudinalTables: string[], value: string): string[] {
    const filterValue = value.toLowerCase();
    return longitudinalTables.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  transformVariableName(variable: string): string {
    variable = variable.toLowerCase();
    return variable.split(' ').join('_').replace('/', '_');
  }

  transformLongitudinalName(
    originalVariableNameMappings: Record<string, string>,
    longitudinal: string
  ): string {
    if (longitudinal.startsWith('longitudinal_')) {
      longitudinal = longitudinal.substring(13);
    }
    longitudinal = longitudinal.split('_').join(' ');
    const mappedValue = originalVariableNameMappings[longitudinal];
    return mappedValue
      ? mappedValue
      : longitudinal.charAt(0).toUpperCase() + longitudinal.slice(1);
  }
}
