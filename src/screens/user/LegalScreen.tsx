import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type Tab = 'privacy' | 'terms';

export default function LegalScreen({ navigation, route }: any) {
  const initialTab = route?.params?.tab ?? 'privacy';
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Legal</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'privacy' && styles.tabOn]}
          onPress={() => setTab('privacy')}
        >
          <Ionicons name={tab === 'privacy' ? 'shield-checkmark' : 'shield-checkmark-outline'} size={16}
            color={tab === 'privacy' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextOn]}>Privacidad</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'terms' && styles.tabOn]}
          onPress={() => setTab('terms')}
        >
          <Ionicons name={tab === 'terms' ? 'document-text' : 'document-text-outline'} size={16}
            color={tab === 'terms' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'terms' && styles.tabTextOn]}>Términos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'privacy' ? <PrivacyContent /> : <TermsContent />}
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}
function Paragraph({ children }: { children: string }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function PrivacyContent() {
  return (
    <View>
      <Text style={styles.lastUpdated}>Última actualización: 10 de mayo de 2026</Text>

      <SectionTitle>1. Información que Recopilamos</SectionTitle>
      <Paragraph>Aquaria recopila la siguiente información cuando utilizas nuestra aplicación:</Paragraph>
      <Paragraph>• Información de cuenta: correo electrónico y nombre al registrarte.</Paragraph>
      <Paragraph>• Datos de acuarios: información sobre tus acuarios, peces, parámetros del agua y tareas que registras voluntariamente.</Paragraph>
      <Paragraph>• Fotos: imágenes que subes a tu galería o perfil, almacenadas de forma segura.</Paragraph>
      <Paragraph>• Datos de uso: interacciones con la app para mejorar la experiencia (no compartidos con terceros).</Paragraph>

      <SectionTitle>2. Cómo Usamos tu Información</SectionTitle>
      <Paragraph>Utilizamos tu información exclusivamente para:</Paragraph>
      <Paragraph>• Proveer y personalizar el servicio de gestión de acuarios.</Paragraph>
      <Paragraph>• Generar alertas inteligentes y recomendaciones basadas en tus datos.</Paragraph>
      <Paragraph>• Enviar notificaciones sobre tareas de mantenimiento pendientes.</Paragraph>
      <Paragraph>• Mejorar la aplicación y corregir errores.</Paragraph>

      <SectionTitle>3. Almacenamiento y Seguridad</SectionTitle>
      <Paragraph>Tus datos se almacenan de forma segura utilizando Supabase con encriptación en tránsito y en reposo. Las contraseñas se almacenan con hash bcrypt y nunca se guardan en texto plano.</Paragraph>
      <Paragraph>No vendemos, compartimos ni transferimos tu información personal a terceros bajo ninguna circunstancia.</Paragraph>

      <SectionTitle>4. Tus Derechos</SectionTitle>
      <Paragraph>Tienes derecho a:</Paragraph>
      <Paragraph>• Acceder a todos tus datos personales almacenados.</Paragraph>
      <Paragraph>• Solicitar la corrección de datos inexactos.</Paragraph>
      <Paragraph>• Solicitar la eliminación completa de tu cuenta y datos asociados.</Paragraph>
      <Paragraph>• Exportar tus datos en formato legible.</Paragraph>

      <SectionTitle>5. Cookies y Seguimiento</SectionTitle>
      <Paragraph>Aquaria no utiliza cookies de seguimiento ni tecnologías de rastreo publicitario. Solo utilizamos almacenamiento local del dispositivo para mantener tu sesión activa.</Paragraph>

      <SectionTitle>6. Menores de Edad</SectionTitle>
      <Paragraph>Aquaria no está dirigida a menores de 13 años. No recopilamos intencionalmente información de menores. Si eres padre o tutor y crees que tu hijo nos ha proporcionado datos, contáctanos para eliminarlos.</Paragraph>

      <SectionTitle>7. Contacto</SectionTitle>
      <Paragraph>Para consultas sobre privacidad, escríbenos a: soporte@aquaria.app</Paragraph>
    </View>
  );
}

function TermsContent() {
  return (
    <View>
      <Text style={styles.lastUpdated}>Última actualización: 10 de mayo de 2026</Text>

      <SectionTitle>1. Aceptación de los Términos</SectionTitle>
      <Paragraph>Al descargar, instalar o utilizar Aquaria, aceptas estos términos de uso. Si no estás de acuerdo, no utilices la aplicación.</Paragraph>

      <SectionTitle>2. Descripción del Servicio</SectionTitle>
      <Paragraph>Aquaria es una herramienta de gestión para acuaristas que permite registrar y monitorear acuarios, peces, parámetros del agua, tareas de mantenimiento y más. Las recomendaciones proporcionadas son orientativas y no sustituyen el consejo de un profesional.</Paragraph>

      <SectionTitle>3. Registro de Cuenta</SectionTitle>
      <Paragraph>Para usar Aquaria necesitas crear una cuenta con un correo electrónico válido. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades realizadas con tu cuenta.</Paragraph>

      <SectionTitle>4. Uso Aceptable</SectionTitle>
      <Paragraph>Te comprometes a:</Paragraph>
      <Paragraph>• Usar la app solo para fines legítimos de gestión acuarista.</Paragraph>
      <Paragraph>• No intentar acceder a cuentas de otros usuarios.</Paragraph>
      <Paragraph>• No realizar ingeniería inversa de la aplicación.</Paragraph>
      <Paragraph>• No usar la app para distribuir contenido ofensivo o ilegal.</Paragraph>

      <SectionTitle>5. Propiedad Intelectual</SectionTitle>
      <Paragraph>Todo el contenido de Aquaria, incluyendo diseño, código, base de datos de especies y textos, está protegido por derechos de autor. La base de datos de 119+ especies fue compilada con información de fuentes públicas y expertos en acuarismo.</Paragraph>

      <SectionTitle>6. Limitación de Responsabilidad</SectionTitle>
      <Paragraph>Aquaria se proporciona "tal cual". Las alertas, recomendaciones de compatibilidad y diagnósticos de enfermedades son orientativos. No nos responsabilizamos por daños derivados del uso de la información proporcionada por la aplicación, incluyendo pero no limitándose a la pérdida de peces o daños al equipo.</Paragraph>

      <SectionTitle>7. Disponibilidad del Servicio</SectionTitle>
      <Paragraph>Nos esforzamos por mantener la app disponible, pero no garantizamos un funcionamiento ininterrumpido. Podemos realizar mantenimiento o actualizaciones que requieran tiempo de inactividad temporal.</Paragraph>

      <SectionTitle>8. Modificaciones</SectionTitle>
      <Paragraph>Nos reservamos el derecho de modificar estos términos. Los cambios significativos se notificarán a través de la aplicación. El uso continuado después de la notificación constituye aceptación de los nuevos términos.</Paragraph>

      <SectionTitle>9. Contacto</SectionTitle>
      <Paragraph>Para consultas sobre estos términos: soporte@aquaria.app</Paragraph>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  tabs: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6, borderRadius: BORDER_RADIUS.lg,
  },
  tabOn: { backgroundColor: COLORS.primary + '14' },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sans },
  tabTextOn: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  content: { padding: SPACING.lg, paddingBottom: 80 },
  lastUpdated: {
    fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans,
    fontStyle: 'italic', marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    fontFamily: FONTS.sansBd, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  paragraph: {
    fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.sans,
    lineHeight: 22, marginBottom: SPACING.xs,
  },
});
