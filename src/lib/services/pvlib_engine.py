import sys
import json
import numpy as np
import pandas as pd
import pvlib
from datetime import datetime, timezone, timedelta

def run_simulation(config):
    lat = config.get('latitude', -15.15)
    lon = config.get('longitude', -43.85)
    tz = config.get('timezone', 'America/Sao_Paulo')
    kwp_dc = config.get('capacidadeKWp', 1400.0)
    kw_ac_max = config.get('capacidadeCA', 1000.0)
    tilt = config.get('tilt', 15.0)
    azimuth = config.get('azimuth', 0.0) # 0 = Norte no hemisfério sul
    gamma_temp = config.get('gamma_temp', -0.0035) # -0.35%/°C
    eta_inv = config.get('eta_inv', 0.985) # 98.5% eficiência de pico dos inversores Huawei SUN2000
    date_str = config.get('date', datetime.now().strftime('%Y-%m-%d'))
    meteo_records = config.get('meteo_data', [])

    location = pvlib.location.Location(lat, lon, tz=tz, altitude=500, name='Usina')

    # Frequência de 5 minutos para o dia completo
    times = pd.date_range(f'{date_str} 00:00:00', f'{date_str} 23:55:00', freq='5min', tz=tz)

    solpos = location.get_solarposition(times)

    # 1. Obter Irradiância
    if meteo_records and len(meteo_records) > 0:
        df_meteo = pd.DataFrame(meteo_records)
        df_meteo['timestamp'] = pd.to_datetime(df_meteo['timestamp']).dt.tz_convert(tz)
        df_meteo = df_meteo.set_index('timestamp').reindex(times, method='nearest', tolerance='10min')

        poa_series = df_meteo['poa'].fillna(0)
        temp_amb = df_meteo['tempAmbiente'].fillna(25.0)
        temp_mod = df_meteo['tempModulos']
        wind_speed = df_meteo['velocidadeVento'].fillna(1.5)
    else:
        # Clear-Sky Ineichen se não houver dados da estação
        cs = location.get_clearsky(times, model='ineichen')
        poa = pvlib.irradiance.get_total_irradiance(
            surface_tilt=tilt,
            surface_azimuth=azimuth,
            solar_zenith=solpos['zenith'],
            solar_azimuth=solpos['azimuth'],
            dni=cs['dni'],
            ghi=cs['ghi'],
            dhi=cs['dhi']
        )
        poa_series = poa['poa_global'].fillna(0)
        # Perfil térmico típico
        temp_amb = 22.0 + 10.0 * np.sin(np.clip((times.hour + times.minute / 60.0 - 6.0) / 12.0 * np.pi, 0, np.pi))
        temp_mod = None
        wind_speed = 2.0

    # 2. Temperatura de Célula (Faiman Model ou medição direta)
    if temp_mod is not None and not temp_mod.isna().all():
        cell_temp = temp_mod.fillna(temp_amb + 15.0)
    else:
        # Faiman: Tcell = Tamb + POA / (u0 + u1 * wind)
        cell_temp = pvlib.temperature.faiman(poa_series, temp_amb, wind_speed, u0=25.0, u1=6.84)

    # 3. Potência DC Ideal (sem perdas de temperatura)
    p_dc_stc = (poa_series / 1000.0) * kwp_dc
    p_dc_stc = np.maximum(0, p_dc_stc)

    # 4. Potência DC com Derating Térmico
    temp_factor = 1.0 + gamma_temp * (cell_temp - 25.0)
    temp_factor = np.clip(temp_factor, 0.7, 1.1)
    p_dc_real = p_dc_stc * temp_factor

    # 5. Potência CA com Inversor e Ceifamento (Clipping a 1.000 kW)
    p_ac_unclipped = p_dc_real * eta_inv
    p_ac_clipped = np.minimum(kw_ac_max, p_ac_unclipped)

    # Zerar à noite
    is_night = solpos['zenith'] > 88.0
    p_ac_clipped[is_night] = 0.0
    p_ac_unclipped[is_night] = 0.0
    p_dc_stc[is_night] = 0.0
    p_dc_real[is_night] = 0.0

    # 6. Cálculo das Energias (kWh = soma de kW * 5/60h)
    dt_hours = 5.0 / 60.0
    e_expected_kwh = float(np.sum(p_ac_clipped) * dt_hours)
    e_unclipped_kwh = float(np.sum(p_ac_unclipped) * dt_hours)
    loss_clipping_kwh = max(0.0, e_unclipped_kwh - e_expected_kwh)

    e_stc_kwh = float(np.sum(p_dc_stc * eta_inv) * dt_hours)
    loss_temp_kwh = max(0.0, e_stc_kwh - e_unclipped_kwh)

    # Pontos de curva para gráfico (hora local)
    curve_points = []
    for t, p_ac, p_unclip, poa, tc in zip(times, p_ac_clipped, p_ac_unclipped, poa_series, cell_temp):
        curve_points.append({
            'time': t.strftime('%H:%M'),
            'expectedKW': round(float(p_ac), 2),
            'unclippedKW': round(float(p_unclip), 2),
            'poa': round(float(poa), 1),
            'cellTemp': round(float(tc), 1)
        })

    result = {
        'date': date_str,
        'capacidadeKWp': kwp_dc,
        'capacidadeCA': kw_ac_max,
        'energiaEsperadaKWh': round(e_expected_kwh, 2),
        'energiaSemCeifamentoKWh': round(e_unclipped_kwh, 2),
        'perdaCeifamentoKWh': round(loss_clipping_kwh, 2),
        'perdaTemperaturaKWh': round(loss_temp_kwh, 2),
        'prEsperado': round((e_expected_kwh / (kwp_dc * (float(np.sum(poa_series) * dt_hours / 1000.0)))) * 100, 1) if np.sum(poa_series) > 0 else 82.0,
        'curvaEsperada': curve_points
    }

    return result

if __name__ == '__main__':
    try:
        raw_input = sys.stdin.read()
        config = json.loads(raw_input) if raw_input.strip() else {}
        output = run_simulation(config)
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
