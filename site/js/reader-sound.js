// Sons ambiente para leitura, gerados no navegador (Web Audio). Sem arquivos, sem licenças.
// Cada som é uma "receita": ruído colorido + filtros + LFOs lentos (e eventos aleatórios).

export const SONS = [
  { id: "chuva", nome: "Chuva suave", icone: "rain" },
  { id: "mar", nome: "Ondas do mar", icone: "waves" },
  { id: "vento", nome: "Vento leve", icone: "wind" },
  { id: "fogueira", nome: "Lareira", icone: "flame" },
  { id: "noite", nome: "Noite no campo", icone: "moon" },
  { id: "piano", nome: "Piano sereno", icone: "note" },
];

function bufferDeRuido(ctx, tipo) {
  const dur = 4;
  const buf = ctx.createBuffer(2, ctx.sampleRate * dur, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, ult = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (tipo === "branco") d[i] = w;
      else if (tipo === "marrom") { ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; }
      else { // rosa (Paul Kellet)
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      }
    }
  }
  return buf;
}

export class Ambiente {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.atual = null;
    this.vol = 0.6;
    this.timer = null;
    this.onFim = null;
    this.buffers = {};
  }

  suportado() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  garantir() {
    if (!this.suportado()) return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  }

  // ---------- peças ----------
  fonte(tipo) {
    const b = (this.buffers[tipo] ||= bufferDeRuido(this.ctx, tipo));
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.loop = true;
    s.loopStart = Math.random() * 2;
    s.start(0, s.loopStart);
    return s;
  }
  filtro(tipo, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }
  ganho(v) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }
  lfo(freq, profundidade, destino) {
    const o = this.ctx.createOscillator();
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = profundidade;
    o.connect(g).connect(destino);
    o.start();
    return o;
  }
  reverb() {
    const seg = 2.8;
    const n = Math.floor(this.ctx.sampleRate * seg);
    const ir = this.ctx.createBuffer(2, n, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = ir;
    return conv;
  }

  // ---------- receitas ----------
  receita(id, saida) {
    const ctx = this.ctx;
    const parar = [];
    const timers = [];
    const fim = () => {
      timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
      parar.forEach((n) => { try { n.stop(); } catch { /* já parado */ } });
    };

    if (id === "chuva") {
      const n = this.fonte("rosa"); parar.push(n);
      n.connect(this.filtro("highpass", 450)).connect(this.filtro("lowpass", 9000)).connect(this.ganho(0.5)).connect(saida);
      const g = this.fonte("branco"); parar.push(g);
      const gd = this.ganho(0);
      g.connect(this.filtro("bandpass", 3600, 1.1)).connect(gd).connect(saida);
      timers.push(setInterval(() => {
        const t = ctx.currentTime;
        gd.gain.cancelScheduledValues(t);
        gd.gain.setValueAtTime(0.0001, t);
        gd.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.09, t + 0.006);
        gd.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      }, 60));
    } else if (id === "mar") {
      const n = this.fonte("marrom"); parar.push(n);
      const g1 = this.ganho(0.3);
      n.connect(this.filtro("lowpass", 700)).connect(g1).connect(saida);
      parar.push(this.lfo(0.09, 0.28, g1.gain));
      const e = this.fonte("rosa"); parar.push(e);
      const g2 = this.ganho(0.06);
      e.connect(this.filtro("bandpass", 2200, 0.6)).connect(g2).connect(saida);
      parar.push(this.lfo(0.11, 0.05, g2.gain));
    } else if (id === "vento") {
      const n = this.fonte("rosa"); parar.push(n);
      const bp = this.filtro("bandpass", 520, 0.8);
      const g = this.ganho(0.45);
      n.connect(bp).connect(g).connect(saida);
      parar.push(this.lfo(0.07, 240, bp.frequency));
      parar.push(this.lfo(0.13, 0.2, g.gain));
    } else if (id === "fogueira") {
      const n = this.fonte("marrom"); parar.push(n);
      n.connect(this.filtro("lowpass", 320)).connect(this.ganho(0.5)).connect(saida);
      const branco = this.buffers.branco || (this.buffers.branco = bufferDeRuido(ctx, "branco"));
      const estalo = () => {
        const s = ctx.createBufferSource();
        s.buffer = branco;
        const hp = this.filtro("highpass", 1400 + Math.random() * 2000);
        const g = this.ganho(0);
        s.connect(hp).connect(g).connect(saida);
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.2, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.05);
        s.start(t, Math.random() * 3);
        s.stop(t + 0.12);
        timers.push(setTimeout(estalo, 40 + Math.random() * 380));
      };
      estalo();
    } else if (id === "noite") {
      const cama = this.fonte("rosa"); parar.push(cama);
      cama.connect(this.filtro("lowpass", 380)).connect(this.ganho(0.1)).connect(saida);
      [4150, 4380, 4620].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const am = this.ganho(0);
        o.connect(am).connect(this.ganho(0.5)).connect(saida);
        o.start();
        parar.push(o);
        const pulso = ctx.createOscillator();
        pulso.type = "square";
        pulso.frequency.value = 9 + i * 2.1;
        const pg = this.ganho(0.012);
        pulso.connect(pg).connect(am.gain);
        pulso.start();
        parar.push(pulso);
        parar.push(this.lfo(0.17 + i * 0.05, 0.012, am.gain));
      });
    } else if (id === "piano") {
      const rev = this.reverb();
      const mix = this.ganho(0.9);
      rev.connect(mix).connect(saida);
      const seco = this.ganho(0.5);
      seco.connect(saida);
      // base grave contínua (muito suave)
      [130.81, 196.0].forEach((f) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const g = this.ganho(0.035);
        o.connect(g).connect(rev);
        o.start();
        parar.push(o);
        parar.push(this.lfo(0.05, 0.02, g.gain));
      });
      const escala = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
      const nota = () => {
        const f = escala[Math.floor(Math.random() * escala.length)];
        const t = ctx.currentTime;
        [[1, "sine", 0.18], [2, "triangle", 0.05]].forEach(([mult, tipo, amp]) => {
          const o = ctx.createOscillator();
          o.type = tipo;
          o.frequency.value = f * mult;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(amp, t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
          o.connect(g);
          g.connect(rev);
          g.connect(seco);
          o.start(t);
          o.stop(t + 4.4);
        });
        timers.push(setTimeout(nota, 2200 + Math.random() * 3200));
      };
      nota();
    }
    return { stop: fim };
  }

  // ---------- controle ----------
  tocar(id) {
    if (!this.garantir()) return false;
    this.parar(1.2);
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(this.master);
    const som = this.receita(id, g);
    g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 2);
    this.atual = { id, g, som };
    return true;
  }

  parar(seg = 1) {
    const a = this.atual;
    if (!a || !this.ctx) return;
    this.atual = null;
    const t = this.ctx.currentTime;
    a.g.gain.cancelScheduledValues(t);
    a.g.gain.setValueAtTime(a.g.gain.value, t);
    a.g.gain.linearRampToValueAtTime(0, t + seg);
    setTimeout(() => {
      try { a.som.stop(); } catch { /* ok */ }
      try { a.g.disconnect(); } catch { /* ok */ }
    }, seg * 1000 + 150);
  }

  volume(v) {
    this.vol = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Desliga com fade depois de `min` minutos (0 = sem temporizador). */
  temporizador(min) {
    clearTimeout(this.timer);
    this.timer = null;
    if (min > 0) {
      this.timer = setTimeout(() => {
        this.parar(10);
        this.onFim?.();
      }, min * 60000);
    }
  }

  tocando() {
    return this.atual ? this.atual.id : null;
  }
}
