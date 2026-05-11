import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';

interface State {
  err: Error | null;
  info: any;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { err: null, info: null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: any) {
    // eslint-disable-next-line no-console
    console.log('🛑 ErrorBoundary caught:', err, info);
    this.setState({ info });
  }

  render() {
    if (this.state.err) {
      const e = this.state.err;
      return (
        <View style={S.root}>
          <Text style={S.title}>⚠️ Error en la app</Text>
          <Text style={S.subtitle}>Se ha producido un error que impidió iniciar la aplicación. Comparte esta info para diagnosticarlo:</Text>
          <ScrollView style={S.box}>
            <Text style={S.label}>Tipo:</Text>
            <Text style={S.text}>{e.name}</Text>
            <Text style={S.label}>Mensaje:</Text>
            <Text style={S.text}>{e.message}</Text>
            <Text style={S.label}>Stack:</Text>
            <Text style={S.text}>{e.stack ?? '(sin stack)'}</Text>
            {this.state.info?.componentStack && (
              <>
                <Text style={S.label}>Component stack:</Text>
                <Text style={S.text}>{this.state.info.componentStack}</Text>
              </>
            )}
            <Text style={S.label}>Plataforma:</Text>
            <Text style={S.text}>{Platform.OS} {Platform.Version}</Text>
          </ScrollView>
          <TouchableOpacity style={S.btn} onPress={() => this.setState({ err: null, info: null })}>
            <Text style={S.btnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const S = StyleSheet.create({
  root:    { flex: 1, padding: 20, backgroundColor: '#0a1628', paddingTop: 60 },
  title:   { fontSize: 22, fontWeight: '800', color: '#ff6b6b', marginBottom: 8 },
  subtitle:{ fontSize: 13, color: '#a8c5e0', marginBottom: 16 },
  box:     { flex: 1, backgroundColor: '#11243a', padding: 12, borderRadius: 10, marginBottom: 16 },
  label:   { fontSize: 11, color: '#88ccff', fontWeight: '700', marginTop: 10 },
  text:    { fontSize: 12, color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 },
  btn:     { backgroundColor: '#0090BF', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
