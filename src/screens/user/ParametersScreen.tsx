import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import * as Notifications from 'expo-notifications';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAquariums } from '../../hooks/useAquariums';
import { useParameterRecords } from '../../hooks/useParameterRecords';
import { getStyleInfo, AquariumStyleInfo } from '../../data/aquariumStyles';
import { ParameterRecord } from '../../types';
import { confirmAction } from '../../utils/confirm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Parameter definitions ─────────────────────────────────────────────────────
interface ParameterDef {
  key: keyof Omit<ParameterRecord, 'id' | 'aquarium_id' | 'date' | 'notes'>;
  label: string;
  unit: string;
  icon: string;
  idealMin: number;
  idealMax: number;
  color: string;
  decimals?: number;
  isStyleParam: boolean;
}

function buildParams(styleInfo?: AquariumStyleInfo): ParameterDef[] {
  const p = styleInfo?.params;
  return [
    {
      key: 'temperature', label: 'Temperatura', unit: '°C', icon: 'thermometer-outline',
      idealMin: p?.temp_min ?? 24, idealMax: p?.temp_max ?? 28,
      color: '#ff7043', decimals: 1, isStyleParam: true,
    },
    {
      key: 'ph', label: 'pH', unit: '', icon: 'flask-outline',
      idealMin: p?.ph_min ?? 6.5, idealMax: p?.ph_max ?? 7.5,
      color: COLORS.primary, decimals: 1, isStyleParam: true,
    },
    {
      key: 'gh', label: 'GH (Dureza)', unit: 'dGH', icon: 'water-outline',
      idealMin: p?.gh_min ?? 5, idealMax: p?.gh_max ?? 15,
      color: '#29b6f6', decimals: 0, isStyleParam: true,
    },
    {
      key: 'kh', label: 'KH (Alcalinidad)', unit: 'dKH', icon: 'shield-outline',
      idealMin: p?.kh_min ?? 3, idealMax: p?.kh_max ?? 8,
      color: '#26c6da', decimals: 0, isStyleParam: true,
    },
    {
      key: 'ammonia', label: 'Amoniaco', unit: 'ppm', icon: 'alert-circle-outline',
      idealMin: 0, idealMax: 0.25, color: COLORS.error, decimals: 2, isStyleParam: false,
    },
    {
      key: 'nitrite', label: 'Nitrito', unit: 'ppm', icon: 'alert-outline',
      idealMin: 0, idealMax: 0.5, color: '#ab47bc', decimals: 2, isStyleParam: false,
    },
    {
      key: 'nitrate', label: 'Nitrato', unit: 'ppm', icon: 'warning-outline',
      idealMin: 0, idealMax: 40, color: COLORS.warning, decimals: 0, isStyleParam: false,
    },
  ];
}

type ParamStatus = { color: string; icon: string; label: string; severity: 'ok' | 'warn' | 'critical' };

function getStatus(value: number, min: number, max: number): ParamStatus {
  const criticalLow  = value < min - (max - min) * 0.2;
  const criticalHigh = value > max + (max - min) * 0.2;
  if (criticalLow || criticalHigh)
    return { color: COLORS.error,   icon: 'close-circle',    label: 'Crítico',        severity: 'critical' };
  if (value < min || value > max)
    return { color: COLORS.warning, icon: 'warning',          label: 'Fuera de rango', severity: 'warn' };
  return   { color: COLORS.success, icon: 'checkmark-circle', label: 'Ideal',          severity: 'ok' };
}

// ── Gauge row (inside a section card) ────────────────────────────────────────
function ParameterGauge({ param, value, styleInfo, isLast }: {
  param: ParameterDef; value?: number; styleInfo?: AquariumStyleInfo; isLast?: boolean;
}) {
  if (value === undefined) return null;
  const status = getStatus(value, param.idealMin, param.idealMax);
  const accentColor = param.isStyleParam && styleInfo ? styleInfo.color : param.color;

  return (
    <>
      <View style={styles.gaugeRow}>
        <View style={[styles.gaugeIconBg, { backgroundColor: accentColor + '20' }]}>
          <Ionicons name={param.icon as any} size={16} color={accentColor} />
        </View>
        <View style={styles.gaugeMiddle}>
          <Text style={styles.gaugeLabel}>{param.label}</Text>
          <Text style={styles.gaugeIdeal}>
            {param.isStyleParam && styleInfo ? `${styleInfo.icon} ` : ''}
            {param.idealMin}–{param.idealMax}{param.unit}
          </Text>
        </View>
        <View style={styles.gaugeRight}>
          <Text style={[styles.gaugeValue, { color: status.color }]}>
            {value.toFixed(param.decimals ?? 0)}{param.unit}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon as any} size={11} color={status.color} />
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>
      {!isLast && <View style={styles.gaugeDivider} />}
    </>
  );
}

// ── Mini Line Chart ───────────────────────────────────────────────────────────
function MiniChart({ records, param, styleInfo }: {
  records: ParameterRecord[];
  param: ParameterDef;
  styleInfo?: AquariumStyleInfo;
}) {
  const chartRecords = records
    .filter(r => r[param.key] !== undefined)
    .slice(-10);

  if (chartRecords.length < 2) return null;

  const data = chartRecords.map(r => r[param.key] as number);
  const labels = chartRecords.map(r =>
    new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  );

  const accentColor = param.isStyleParam && styleInfo ? styleInfo.color : param.color;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Ionicons name={param.icon as any} size={14} color={accentColor} />
        <Text style={[styles.chartTitle, { color: accentColor }]}>{param.label}</Text>
        <Text style={styles.chartRange}>
          Ideal: {param.idealMin}–{param.idealMax}{param.unit}
        </Text>
      </View>
      <LineChart
        data={{
          labels: labels.length > 5 ? labels.map((l, i) => (i % 2 === 0 ? l : '')) : labels,
          datasets: [{ data, color: () => accentColor, strokeWidth: 2 }],
        }}
        width={SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2}
        height={120}
        yAxisSuffix={param.unit}
        withDots
        withInnerLines={false}
        withOuterLines={false}
        withHorizontalLabels
        withVerticalLabels
        chartConfig={{
          backgroundColor: COLORS.backgroundCard,
          backgroundGradientFrom: COLORS.backgroundCard,
          backgroundGradientTo: COLORS.backgroundCard,
          decimalPlaces: param.decimals ?? 0,
          color: () => accentColor,
          labelColor: () => COLORS.textMuted,
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: accentColor,
            fill: COLORS.backgroundCard,
          },
          propsForBackgroundLines: { stroke: 'transparent' },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ParametersScreen() {
  const { aquariums, selectedAquarium, selectedId, selectAquarium } = useAquariums();
  const { recordsFor, addRecord, deleteRecord } = useParameterRecords();

  const styleInfo = getStyleInfo(selectedAquarium?.aquarium_style);
  const PARAMETERS = useMemo(() => buildParams(styleInfo), [selectedAquarium?.aquarium_style]);

  const records = useMemo(
    () => (selectedAquarium ? recordsFor(selectedAquarium.id) : []),
    [selectedAquarium, recordsFor]
  );

  const [showModal, setShowModal]     = useState(false);
  const [showChart, setShowChart]     = useState(false);
  const [chartParam, setChartParam]   = useState<ParameterDef | null>(null);
  const [form, setForm]               = useState<Partial<ParameterRecord>>({});
  const [notes, setNotes]             = useState('');
  const [refreshing, setRefreshing]   = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const latestRecord = records[records.length - 1];

  const styleAlerts = useMemo(() => {
    if (!latestRecord) return [];
    return PARAMETERS
      .map(p => {
        const val = latestRecord[p.key] as number | undefined;
        if (val === undefined) return null;
        const st = getStatus(val, p.idealMin, p.idealMax);
        return st.severity !== 'ok' ? { param: p, value: val, status: st } : null;
      })
      .filter(Boolean) as { param: ParameterDef; value: number; status: ParamStatus }[];
  }, [latestRecord, PARAMETERS]);

  const criticalAlerts = styleAlerts.filter(a => a.status.severity === 'critical');

  const saveRecord = async () => {
    if (!selectedAquarium) return;
    const hasValue = PARAMETERS.some(p => form[p.key] !== undefined);
    if (!hasValue) { Alert.alert('Error', 'Ingresa al menos un parámetro.'); return; }
    await addRecord({
      aquarium_id: selectedAquarium.id,
      date: new Date().toISOString(),
      notes,
      ...form,
    });

    // ── Critical parameter notifications ─────────────────────────────────────
    const criticals = PARAMETERS.filter(p => {
      const val = form[p.key] as number | undefined;
      if (val === undefined) return false;
      return getStatus(val, p.idealMin, p.idealMax).severity === 'critical';
    });

    if (criticals.length > 0) {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const paramsList = criticals
            .map(p => {
              const val = form[p.key] as number;
              return `${p.label}: ${val.toFixed(p.decimals ?? 0)}${p.unit}`;
            })
            .join(' · ');
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⚠️ Parámetros críticos — ${selectedAquarium.name}`,
              body: paramsList,
              sound: true,
            },
            trigger: null, // immediate
          });
        }
      } catch (e) { console.warn('[Parameters] Notification failed:', e); }
    }
    // ─────────────────────────────────────────────────────────────────────────

    setForm({});
    setNotes('');
    setShowModal(false);

    // Success feedback
    const outOfRange = PARAMETERS.filter(p => {
      const val = form[p.key] as number | undefined;
      if (val === undefined) return false;
      return getStatus(val, p.idealMin, p.idealMax).severity !== 'ok';
    });
    if (outOfRange.length > 0) {
      Alert.alert(
        '⚠️ Registro guardado',
        `${outOfRange.length} parámetro${outOfRange.length > 1 ? 's' : ''} fuera del rango ideal. Revisa las alertas.`,
      );
    } else {
      Alert.alert('✅ Registro guardado', 'Todos los parámetros están en rango ideal.');
    }
  };

  const setParam = (key: string, value: string) => {
    const num = parseFloat(value);
    setForm(prev => ({ ...prev, [key]: isNaN(num) ? undefined : num }));
  };

  const openChart = (param: ParameterDef) => {
    setChartParam(param);
    setShowChart(true);
  };

  const handleDeleteRecord = (id: string) => {
    confirmAction('Eliminar registro', '¿Eliminar este registro?', () => deleteRecord(id));
  };

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Parámetros del agua</Text>
            <Text style={styles.headerSub}>Monitorea la calidad de tu acuario</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: COLORS.primary + '18' }]}>
            <Ionicons name="water" size={22} color={COLORS.primary} />
          </View>
        </View>

        {/* ── Aquarium selector ── */}
        {aquariums.length > 0 && (
          <View style={styles.aqSelectorRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
              {aquariums.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.aqTab, selectedId === a.id && styles.aqTabActive]}
                  onPress={() => selectAquarium(a.id)}
                >
                  <Ionicons name="cube-outline" size={13} color={selectedId === a.id ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.aqTabText, selectedId === a.id && styles.aqTabTextActive]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {!selectedAquarium ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Sin acuario</Text>
            <Text style={styles.emptySubtitle}>Crea un acuario en la sección Acuario primero.</Text>
          </View>
        ) : (
          <>
            {/* ── Style card ── */}
            {styleInfo ? (
              <View style={styles.styleCard}>
                <View style={[styles.styleCardIcon, { backgroundColor: styleInfo.color + '18' }]}>
                  <Text style={styles.styleCardEmoji}>{styleInfo.icon}</Text>
                </View>
                <View style={styles.styleCardBody}>
                  <Text style={styles.styleCardName}>{selectedAquarium.name}</Text>
                  <Text style={styles.styleCardType}>{styleInfo.label}</Text>
                  <View style={styles.styleCardPills}>
                    <View style={styles.styleCardPill}>
                      <Text style={styles.styleCardPillText}>🌡️ {styleInfo.params.temp_min}–{styleInfo.params.temp_max}°C</Text>
                    </View>
                    <View style={styles.styleCardPill}>
                      <Text style={styles.styleCardPillText}>⚗️ pH {styleInfo.params.ph_min}–{styleInfo.params.ph_max}</Text>
                    </View>
                    <View style={styles.styleCardPill}>
                      <Text style={styles.styleCardPillText}>💧 GH {styleInfo.params.gh_min}–{styleInfo.params.gh_max}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noStyleBanner}>
                <Ionicons name="cube-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.noStyleText}>
                  {selectedAquarium.name} · Asigna un estilo en la sección Acuario para rangos personalizados.
                </Text>
              </View>
            )}

            {/* ── Alert panel ── */}
            {latestRecord && styleAlerts.length > 0 && (
              <View style={[
                styles.alertPanel,
                criticalAlerts.length > 0 ? styles.alertPanelCritical : styles.alertPanelWarn,
              ]}>
                <Ionicons
                  name={criticalAlerts.length > 0 ? 'close-circle' : 'warning'}
                  size={20}
                  color={criticalAlerts.length > 0 ? COLORS.error : COLORS.warning}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertPanelTitle, { color: criticalAlerts.length > 0 ? COLORS.error : COLORS.warning }]}>
                    {criticalAlerts.length > 0
                      ? `${criticalAlerts.length} parámetro${criticalAlerts.length > 1 ? 's' : ''} crítico${criticalAlerts.length > 1 ? 's' : ''}`
                      : `${styleAlerts.length} parámetro${styleAlerts.length > 1 ? 's' : ''} fuera del rango`}
                  </Text>
                  {styleAlerts.map(a => (
                    <Text key={String(a.param.key)} style={styles.alertPanelItem}>
                      • {a.param.label}: {a.value.toFixed(a.param.decimals ?? 0)}{a.param.unit}
                      {'  '}(ideal {a.param.idealMin}–{a.param.idealMax}{a.param.unit})
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* ── Latest record ── */}
            {latestRecord ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Último registro</Text>
                  <Text style={styles.sectionDate}>
                    {new Date(latestRecord.date).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>

                {/* Grupo 1: Parámetros del estilo */}
                {(() => {
                  const styleParams = PARAMETERS.filter(p => p.isStyleParam && latestRecord[p.key] !== undefined);
                  if (styleParams.length === 0) return null;
                  return (
                    <View style={styles.paramSection}>
                      <View style={styles.paramSectionHeader}>
                        <Text style={styles.paramSectionIcon}>
                          {styleInfo ? styleInfo.icon : '🌊'}
                        </Text>
                        <Text style={styles.paramSectionTitle}>
                          {styleInfo ? `Parámetros ${styleInfo.label}` : 'Parámetros del agua'}
                        </Text>
                        <Text style={styles.tapHint}>Toca para ver gráfico</Text>
                      </View>
                      {PARAMETERS.filter(p => p.isStyleParam).map((p, i, arr) => {
                        const visibles = arr.filter(x => latestRecord[x.key] !== undefined);
                        const isLast = p === visibles[visibles.length - 1];
                        return (
                          <TouchableOpacity key={String(p.key)} onPress={() => openChart(p)} activeOpacity={0.75}>
                            <ParameterGauge param={p} value={latestRecord[p.key] as number} styleInfo={styleInfo} isLast={isLast} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}

                {/* Grupo 2: Ciclo del nitrógeno */}
                {(() => {
                  const nitrogenParams = PARAMETERS.filter(p => !p.isStyleParam && latestRecord[p.key] !== undefined);
                  if (nitrogenParams.length === 0) return null;
                  return (
                    <View style={styles.paramSection}>
                      <View style={styles.paramSectionHeader}>
                        <Text style={styles.paramSectionIcon}>🧪</Text>
                        <Text style={styles.paramSectionTitle}>Ciclo del nitrógeno</Text>
                        <Text style={styles.tapHint}>Toca para ver gráfico</Text>
                      </View>
                      {PARAMETERS.filter(p => !p.isStyleParam).map((p, i, arr) => {
                        const visibles = arr.filter(x => latestRecord[x.key] !== undefined);
                        const isLast = p === visibles[visibles.length - 1];
                        return (
                          <TouchableOpacity key={String(p.key)} onPress={() => openChart(p)} activeOpacity={0.75}>
                            <ParameterGauge param={p} value={latestRecord[p.key] as number} styleInfo={styleInfo} isLast={isLast} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}

                {/* Notas */}
                {latestRecord.notes ? (
                  <View style={styles.notesCard}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.notesText}>{latestRecord.notes}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="water-outline" size={64} color={COLORS.primary} />
                <Text style={styles.emptyTitle}>Sin registros</Text>
                <Text style={styles.emptySubtitle}>
                  Registra los parámetros de {selectedAquarium.name}
                  {styleInfo ? ` según los rangos del acuario ${styleInfo.label}` : ''}.
                </Text>
              </View>
            )}

            {/* ── Style tips ── */}
            {styleInfo && (
              <View style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                  <View style={styles.tipsIconWrap}>
                    <Text style={styles.tipsIcon}>💡</Text>
                  </View>
                  <Text style={styles.tipsTitle}>Consejos para {styleInfo.label}</Text>
                </View>
                {styleInfo.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <View style={styles.tipBullet} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── History ── */}
            {records.length > 1 && (
              <View style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <Text style={styles.historyTitle}>Historial</Text>
                  <View style={styles.historyCountPill}>
                    <Text style={styles.historyCountText}>{records.length} registros</Text>
                  </View>
                </View>
                {[...records].reverse().slice(1).map((rec, idx, arr) => {
                  const outCount = PARAMETERS.filter(p => {
                    const val = rec[p.key] as number | undefined;
                    return val !== undefined && getStatus(val, p.idealMin, p.idealMax).severity !== 'ok';
                  }).length;
                  return (
                    <View key={rec.id}>
                      <View style={styles.historyRow}>
                        <View style={styles.historyRowHeader}>
                          <View style={styles.historyDateRow}>
                            <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                            <Text style={styles.historyDate}>
                              {new Date(rec.date).toLocaleDateString('es-ES', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          <View style={styles.historyActions}>
                            {outCount > 0 && (
                              <View style={styles.historyAlert}>
                                <Ionicons name="warning" size={11} color={COLORS.warning} />
                                <Text style={styles.historyAlertText}>{outCount} fuera</Text>
                              </View>
                            )}
                            <TouchableOpacity onPress={() => handleDeleteRecord(rec.id)}>
                              <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.historyValues}>
                          {PARAMETERS.filter(p => rec[p.key] !== undefined).map(p => {
                            const val = rec[p.key] as number;
                            const st = getStatus(val, p.idealMin, p.idealMax);
                            return (
                              <View key={String(p.key)} style={[styles.historyParam, { backgroundColor: st.color + '14' }]}>
                                <Ionicons name={st.icon as any} size={10} color={st.color} />
                                <Text style={[styles.historyParamText, { color: st.color }]}>
                                  {p.label}: {val.toFixed(p.decimals ?? 0)}{p.unit}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                      {idx < arr.length - 1 && <View style={styles.historyDivider} />}
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={styles.recordButton} onPress={() => setShowModal(true)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.recordButtonText}>Registrar parámetros</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* ── Chart Modal ── */}
      <Modal visible={showChart} animationType="fade" transparent>
        <View style={styles.chartModalOverlay}>
          <View style={styles.chartModalBox}>
            <View style={styles.chartModalHeader}>
              <Text style={styles.chartModalTitle}>
                {chartParam?.label} — últimos registros
              </Text>
              <TouchableOpacity onPress={() => setShowChart(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {chartParam && (
              <MiniChart records={records} param={chartParam} styleInfo={styleInfo} />
            )}
            {chartParam && records.filter(r => r[chartParam.key] !== undefined).length < 2 && (
              <Text style={styles.chartNotEnough}>
                Necesitas al menos 2 registros de este parámetro para ver el gráfico.
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Register Modal ── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nuevos parámetros</Text>
                {styleInfo && (
                  <Text style={[styles.modalStyleTag, { color: styleInfo.color }]}>
                    {styleInfo.icon} {styleInfo.label} · {selectedAquarium?.name}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => { setShowModal(false); setForm({}); setNotes(''); }}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formGroupLabel}>
                {styleInfo ? `${styleInfo.icon} Parámetros ${styleInfo.label}` : '🌊 Agua'}
              </Text>
              {PARAMETERS.filter(p => p.isStyleParam).map(p => {
                const val = form[p.key];
                const status = val !== undefined ? getStatus(val as number, p.idealMin, p.idealMax) : null;
                return (
                  <View key={String(p.key)} style={styles.formRow}>
                    <View style={styles.formLabelCol}>
                      <View style={styles.formLabelRow}>
                        <Ionicons name={p.icon as any} size={15} color={styleInfo?.color ?? p.color} />
                        <Text style={styles.formLabelText}>{p.label}</Text>
                      </View>
                      <Text style={styles.formRangeHint}>Ideal: {p.idealMin}–{p.idealMax}{p.unit}</Text>
                    </View>
                    <View style={styles.formInputWrapper}>
                      <TextInput
                        style={[styles.formInput, status && { borderColor: status.color + '88' }]}
                        value={form[p.key]?.toString() ?? ''}
                        onChangeText={v => setParam(String(p.key), v)}
                        placeholder={`${p.idealMin}–${p.idealMax}`}
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="decimal-pad"
                      />
                      {status && (
                        <Ionicons name={status.icon as any} size={14} color={status.color} style={styles.formStatusIcon} />
                      )}
                    </View>
                  </View>
                );
              })}

              <Text style={styles.formGroupLabel}>🧪 Ciclo del nitrógeno</Text>
              {PARAMETERS.filter(p => !p.isStyleParam).map(p => {
                const val = form[p.key];
                const status = val !== undefined ? getStatus(val as number, p.idealMin, p.idealMax) : null;
                return (
                  <View key={String(p.key)} style={styles.formRow}>
                    <View style={styles.formLabelCol}>
                      <View style={styles.formLabelRow}>
                        <Ionicons name={p.icon as any} size={15} color={p.color} />
                        <Text style={styles.formLabelText}>{p.label}</Text>
                      </View>
                      <Text style={styles.formRangeHint}>Ideal: {p.idealMin}–{p.idealMax}{p.unit}</Text>
                    </View>
                    <View style={styles.formInputWrapper}>
                      <TextInput
                        style={[styles.formInput, status && { borderColor: status.color + '88' }]}
                        value={form[p.key]?.toString() ?? ''}
                        onChangeText={v => setParam(String(p.key), v)}
                        placeholder={`${p.idealMin}–${p.idealMax}`}
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="decimal-pad"
                      />
                      {status && (
                        <Ionicons name={status.icon as any} size={14} color={status.color} style={styles.formStatusIcon} />
                      )}
                    </View>
                  </View>
                );
              })}

              <Text style={styles.formGroupLabel}>📝 Notas</Text>
              <TextInput
                style={[styles.formInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Observaciones del acuario..."
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setForm({}); setNotes(''); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, styleInfo && { backgroundColor: styleInfo.color }]}
                onPress={saveRecord}
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Aquarium selector
  aqSelectorRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  aqTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  aqTabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  aqTabText: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.sans },
  aqTabTextActive: { color: COLORS.primary, fontWeight: '600', fontFamily: FONTS.sansSb },

  // Style card
  styleCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  styleCardIcon: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  styleCardEmoji: { fontSize: 26 },
  styleCardBody: { flex: 1 },
  styleCardName: { fontSize: 15, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 1 },
  styleCardType: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, marginBottom: 8 },
  styleCardPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  styleCardPill: {
    backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  styleCardPillText: { fontSize: 11, fontFamily: FONTS.sansMd, color: COLORS.textSecondary },

  noStyleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  noStyleText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 17, fontFamily: FONTS.sans },

  // Alert panel
  alertPanel: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderLeftWidth: 3,
  },
  alertPanelCritical: { backgroundColor: COLORS.error + '14', borderColor: COLORS.error + '44', borderLeftColor: COLORS.error },
  alertPanelWarn:     { backgroundColor: COLORS.warning + '14', borderColor: COLORS.warning + '44', borderLeftColor: COLORS.warning },
  alertPanelTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4, fontFamily: FONTS.sansBd },
  alertPanelItem: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2, fontFamily: FONTS.sans },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xs,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  sectionDate: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },

  // Parameter section card
  paramSection: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  paramSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  paramSectionIcon: { fontSize: 16 },
  paramSectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  tapHint: { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic', fontFamily: FONTS.sans },

  // Gauge row (inside paramSection)
  gaugeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  gaugeDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  gaugeIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  gaugeMiddle: { flex: 1 },
  gaugeLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  gaugeIdeal: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.sans },
  gaugeRight: { alignItems: 'flex-end', gap: 4 },
  gaugeValue: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.sansEb },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: 6, paddingVertical: 2,
  },
  statusLabel: { fontSize: 10, fontWeight: '600', fontFamily: FONTS.sansSb },

  // Chart modal
  chartModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
  chartModalBox: { backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl, padding: SPACING.md, overflow: 'hidden' },
  chartModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  chartModalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  chartNotEnough: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', padding: SPACING.lg, fontFamily: FONTS.sans },
  chartContainer: { overflow: 'hidden' },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
  chartTitle: { fontSize: 13, fontWeight: '700', flex: 1, fontFamily: FONTS.sansBd },
  chartRange: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  chart: { borderRadius: BORDER_RADIUS.md, marginLeft: -SPACING.sm },

  // Notes
  notesCard: {
    flexDirection: 'row', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  notesText: { flex: 1, color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.sans },

  // Tips card
  tipsCard: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  tipsIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tipsIcon: { fontSize: 16 },
  tipsTitle: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 6 },
  tipText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, fontFamily: FONTS.sans },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm, fontFamily: FONTS.sansEb },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.sans },

  // History
  historySection: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  historySectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  historyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  historyCountPill: {
    backgroundColor: COLORS.primary + '18', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  historyCountText: { color: COLORS.primary, fontSize: 11, fontFamily: FONTS.sansSb, fontWeight: '600' },
  historyRow: { padding: SPACING.md },
  historyDivider: { height: 1, backgroundColor: COLORS.border },
  historyRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyDate: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },
  historyActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  historyAlert: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  historyAlertText: { fontSize: 11, color: COLORS.warning, fontFamily: FONTS.sans },
  historyValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  historyParam: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  historyParamText: { fontSize: 11, fontFamily: FONTS.sansSb, fontWeight: '600' },

  // Record button
  recordButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 15, marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  recordButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15, fontFamily: FONTS.sansEb },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: COLORS.backgroundCard, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, fontFamily: FONTS.sansEb },
  modalStyleTag: { fontSize: 12, fontWeight: '600', marginTop: 2, fontFamily: FONTS.sansSb },

  formGroupLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
    fontFamily: FONTS.sansBd,
  },
  formRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  formLabelCol: { flex: 1 },
  formLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formLabelText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.sans },
  formRangeHint: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, marginLeft: 21, fontFamily: FONTS.sans },
  formInputWrapper: { position: 'relative', justifyContent: 'center' },
  formInput: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm, paddingRight: 28, color: COLORS.text, width: 110,
    borderWidth: 1, borderColor: COLORS.border, textAlign: 'right',
  },
  formStatusIcon: { position: 'absolute', right: 8 },
  notesInput: { width: '100%', textAlign: 'left', minHeight: 60, paddingRight: SPACING.sm },
  modalButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, padding: 12, borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.background, alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontFamily: FONTS.sans },
  saveBtn: {
    flex: 1, padding: 12, borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold', fontFamily: FONTS.sansEb },
});
