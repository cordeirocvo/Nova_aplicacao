import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fontes padrão do PDF (Helvetica)
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a8a',
    paddingBottom: 15,
  },
  logo: {
    width: 120,
  },
  headerRight: {
    textAlign: 'right',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textTransform: 'uppercase',
  },
  projectNumber: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#1e3a8a',
    padding: 6,
    paddingLeft: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
    borderRadius: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  techGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  techCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  techValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginTop: 5,
  },
  engineeringBox: {
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  engineeringTitle: {
    color: '#00bfa5',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
  },
  engRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  engCol: {
    flex: 1,
  },
  engLabel: {
    color: '#94a3b8',
    fontSize: 7,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  engValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  safetySection: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  safetyBox: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  safetyTitle: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  safetyItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    width: 8,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  safetyText: {
    fontSize: 8,
    color: '#450a0a',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  signatureContainer: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  signatureLine: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 8,
    textAlign: 'center',
  },
  signatureName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  signatureRole: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 2,
  },
  standardsBox: {
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  standardItem: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 4,
  }
});

interface EVReportPDFProps {
  project: any;
  logoUrl?: string;
}

export const EVReportPDF: React.FC<EVReportPDFProps> = ({ project, logoUrl }) => {
  const dateStr = format(new Date(project.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const projectId = project.id.substring(project.id.length - 8).toUpperCase();
  
  // URL absoluta é necessária para o @react-pdf/renderer no cliente
  const safeLogoUrl = logoUrl || 'https://raw.githubusercontent.com/cordeirocvo/Nova_aplicacao/main/public/logo.png';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Fixed on all pages */}
        <View style={styles.header} fixed>
          <Image src={safeLogoUrl} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Laudo de Infraestrutura EV</Text>
            <Text style={styles.projectNumber}>PROJETO Nº {projectId}</Text>
          </View>
        </View>

        {/* Content Section - Allows wrapping */}
        <View style={{ flexGrow: 1 }}>
          {/* Informações Básicas */}
          <View style={styles.section}>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.label}>Projeto</Text>
                <Text style={styles.value}>{project.projectName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.label}>Cliente</Text>
                <Text style={styles.value}>{project.clientName || 'Geral'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.label}>Data de Emissão</Text>
                <Text style={styles.value}>{dateStr}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.label}>Localização</Text>
                <Text style={styles.value}>{project.location || 'Urbano'}</Text>
              </View>
            </View>
          </View>

          {/* Resumo Técnico */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo Técnico do Dimensionamento</Text>
            <View style={styles.techGrid}>
              <View style={styles.techCard}>
                <Text style={styles.label}>Potência Carregador</Text>
                <Text style={styles.techValue}>{project.charger?.power} kW</Text>
              </View>
              <View style={styles.techCard}>
                <Text style={styles.label}>Corrente Calculada</Text>
                <Text style={styles.techValue}>{project.calculatedCurrent.toFixed(1)} A</Text>
              </View>
              <View style={styles.techCard}>
                <Text style={styles.label}>Disjuntor Principal</Text>
                <Text style={styles.techValue}>{project.calculatedBreaker} A (Curva C)</Text>
              </View>
            </View>
          </View>

          {/* Engenharia Detalhada */}
          <View style={styles.engineeringBox} wrap={false}>
            <Text style={styles.engineeringTitle}>Especificações de Condutores e Circuitos</Text>
            
            {project.hasTransformer && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: '#00bfa5', fontSize: 8, fontWeight: 'bold', marginBottom: 10 }}>LADO PRIMÁRIO (TRANSFORMADOR)</Text>
                <View style={styles.engRow}>
                  <View style={styles.engCol}>
                    <Text style={styles.engLabel}>Cabo Recomendado</Text>
                    <Text style={styles.engValue}>{project.calculatedPrimaryCable} mm²</Text>
                  </View>
                  <View style={styles.engCol}>
                    <Text style={styles.engLabel}>Proteção Primária</Text>
                    <Text style={styles.engValue}>{project.calculatedPrimaryBreaker} A</Text>
                  </View>
                  <View style={styles.engCol}>
                    <Text style={styles.engLabel}>Distância Lançada</Text>
                    <Text style={styles.engValue}>{project.transformerDistance} m</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={{ color: '#00bfa5', fontSize: 8, fontWeight: 'bold', marginBottom: 10 }}>
              {project.hasTransformer ? 'LADO SECUNDÁRIO / CARREGADOR' : 'CIRCUITO DE ALIMENTAÇÃO DIRETA'}
            </Text>
            <View style={styles.engRow}>
              <View style={styles.engCol}>
                <Text style={styles.engLabel}>Cabo do Circuito</Text>
                <Text style={styles.engValue}>{project.calculatedCableGauge} mm²</Text>
              </View>
              <View style={styles.engCol}>
                <Text style={styles.engLabel}>Eletroduto</Text>
                <Text style={styles.engValue}>{project.calculatedConduit}</Text>
              </View>
              <View style={styles.engCol}>
                <Text style={styles.engLabel}>Queda de Tensão</Text>
                <Text style={[styles.engValue, project.voltageDrop > 4 ? { color: '#fb7185' } : {}]}>{project.voltageDrop}%</Text>
              </View>
            </View>
          </View>

          {/* Segurança e Normas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Segurança e Conformidade Normativa</Text>
            <View style={styles.safetySection}>
              <View style={styles.safetyBox}>
                <Text style={styles.safetyTitle}>Bombeiros / AVCB (IT 41)</Text>
                <View style={styles.safetyItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.safetyText}>Extintor: {project.fireExtinguisherType}</Text>
                </View>
                <View style={styles.safetyItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.safetyText}>Botão Emergência: Obrigatório a 5m (Tipo Cogumelo)</Text>
                </View>
                <View style={styles.safetyItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.safetyText}>Sinalização: Pintura e Placas conforme NBR 17019</Text>
                </View>
              </View>
              <View style={[styles.safetyBox, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                <Text style={[styles.safetyTitle, { color: '#16a34a' }]}>Proteções Elétricas</Text>
                <View style={styles.safetyItem}>
                  <Text style={[styles.bullet, { color: '#16a34a' }]}>•</Text>
                  <Text style={[styles.safetyText, { color: '#064e3b' }]}>DR/IDR: {project.calculatedIDR || project.calculatedDR}</Text>
                </View>
                <View style={styles.safetyItem}>
                  <Text style={[styles.bullet, { color: '#16a34a' }]}>•</Text>
                  <Text style={[styles.safetyText, { color: '#064e3b' }]}>DPS: {project.calculatedDPS}</Text>
                </View>
                <View style={styles.safetyItem}>
                  <Text style={[styles.bullet, { color: '#16a34a' }]}>•</Text>
                  <Text style={[styles.safetyText, { color: '#064e3b' }]}>Aterramento: {project.groundingType} - {project.groundingAnalysis}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Normas Aplicáveis */}
          <View style={styles.section} wrap={false}>
            <View style={styles.standardsBox}>
               <Text style={styles.label}>Normas ABNT Aplicáveis</Text>
               <Text style={styles.standardItem}>{project.abntStandards}</Text>
               <Text style={[styles.label, { marginTop: 8 }]}>Instrução Técnica Bombeiros</Text>
               <Text style={styles.standardItem}>{project.fireDeptStandards || 'IT 41/2023 - CBMG'}</Text>
            </View>
          </View>

          {/* Assinaturas */}
          <View style={styles.signatureContainer} wrap={false}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>Engenharia Responsável</Text>
              <Text style={styles.signatureRole}>Cordeiro Energia O&M</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>Cliente / Contratante</Text>
              <Text style={styles.signatureRole}>Aceite e Aprovação</Text>
            </View>
          </View>
        </View>

        {/* Footer - Fixed on all pages */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Cordeiro Energia • Sistema de Gestão de Infraestrutura EV • www.cordeiroenergia.com.br</Text>
          <Text style={[styles.footerText, { marginTop: 4 }]} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};
