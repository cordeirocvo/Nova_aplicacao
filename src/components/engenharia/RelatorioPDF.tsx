import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registrar fontes para visual premium
// Font.register({ family: 'Inter', src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hJPMA.woff' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 20,
  },
  logo: {
    width: 140,
  },
  titleContainer: {
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a8a',
    backgroundColor: '#f8fafc',
    padding: 6,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#00BFA5',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 150,
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
    padding: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 6,
  },
  tableCell: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  highlightBox: {
    backgroundColor: '#f0fdfa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    marginTop: 10,
  },
  highlightTitle: {
    color: '#0f766e',
    fontWeight: 'bold',
    marginBottom: 5,
  }
});

interface RelatorioPDFProps {
  data: any;
}

export const RelatorioPDF: React.FC<RelatorioPDFProps> = ({ data }) => {
  const { projeto, equipamentos } = data;
  const dataRef = new Date().toLocaleDateString('pt-BR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/logo_cordeiro.png" style={styles.logo} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Relatório Técnico</Text>
            <Text style={styles.subtitle}>CWP {projeto.id.slice(-6).toUpperCase()}</Text>
          </View>
        </View>

        {/* Capa Info */}
        <View style={styles.section}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 5 }}>{projeto.nome}</Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>Cliente: {projeto.cliente || 'Consumidor Final'}</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Data do Estudo:</Text>
            <Text style={styles.value}>{dataRef}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status do Projeto:</Text>
            <Text style={styles.value}>{projeto.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Responsável:</Text>
            <Text style={styles.value}>Engenharia Cordeiro</Text>
          </View>
        </View>

        {/* Sobre a Empresa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre a Cordeiro Energia</Text>
          <Text style={{ lineHeight: 1.5 }}>
            A Cordeiro Energia (COENERGY) faz parte do conceituado Grupo Cordeiro. 
            Nossa missão é entregar inteligência, performance e confiabilidade para usinas solares em todo o Brasil. 
            Focamos na maximização da geração através de tecnologia de ponta e gestão eficiente de O&M.
          </Text>
        </View>

        {/* Análise de Consumo */}
        {projeto.analiseFatura && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Diagnóstico de Consumo</Text>
            <View style={styles.row}><Text style={styles.label}>Concessionária:</Text><Text style={styles.value}>{projeto.analiseFatura.concessionaria}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Grupo Tarifário:</Text><Text style={styles.value}>{projeto.analiseFatura.grupoTarifario} / {projeto.analiseFatura.subgrupo}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Consumo Médio:</Text><Text style={styles.value}>{projeto.analiseFatura.consumoMedioMensalKWh} kWh/mês</Text></View>
            {projeto.analiseFatura.demandaContratadaKW && (
              <View style={styles.row}><Text style={styles.label}>Demanda Contratada:</Text><Text style={styles.value}>{projeto.analiseFatura.demandaContratadaKW} kW</Text></View>
            )}
          </View>
        )}

        {/* Sistema Fotovoltaico */}
        {projeto.estudoSolar && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Solução Fotovoltaica</Text>
            <View style={styles.row}><Text style={styles.label}>Potência Instalada:</Text><Text style={styles.value}>{projeto.estudoSolar.potenciaNecessariaKWp} kWp</Text></View>
            <View style={styles.row}>
              <Text style={styles.label}>Equipamentos:</Text>
              <Text style={styles.value}>
                {projeto.estudoSolar.quantidadeModulos}x {equipamentos.modulo?.fabricante} {equipamentos.modulo?.potenciaPicoWp}Wp + {equipamentos.inversorSolar?.fabricante} {equipamentos.inversorSolar?.potenciaNominalKW}kW
              </Text>
            </View>
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>Geração Estimada</Text>
              <Text>O sistema produzirá aproximadamente {(projeto.estudoSolar.geracaoAlvoKWh || 0).toFixed(0)} kWh/mês, representando uma redução drástica na dependência da rede.</Text>
            </View>
          </View>
        )}

        {/* BESS */}
        {projeto.estudoBESS && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Sistema de Armazenamento (BESS)</Text>
            <View style={styles.row}><Text style={styles.label}>Capacidade:</Text><Text style={styles.value}>{equipamentos.bateria?.capacidadeNomKWh * projeto.estudoBESS.quantidadeBaterias} kWh</Text></View>
            <View style={styles.row}><Text style={styles.label}>Estratégia:</Text><Text style={styles.value}>{projeto.estudoBESS.estrategia}</Text></View>
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>Economia Projetada</Text>
              <Text>Retorno estimado (Payback) de {projeto.estudoBESS.paybackSimples} anos com TIR de {projeto.estudoBESS.tir}%.</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Cordeiro Energia | Curvelo - MG | www.cordeiroenergia.com.br</Text>
          <Text>Relatório gerado em {dataRef} - Engenharia COENERGY</Text>
        </View>
      </Page>
    </Document>
  );
};
