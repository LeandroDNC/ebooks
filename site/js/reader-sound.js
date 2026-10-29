// Sons ambiente para leitura, gerados no navegador (Web Audio). Sem arquivos, sem licenças.
// Cada som é uma "receita": ruído colorido + filtros + LFOs lentos (e eventos aleatórios).

export const SONS = [
  { id: "chuva", nome: "Chuva suave", icone: "rain" },
  { id: "mar", nome: "Ondas do mar", icone: "waves" },
  { id: "vento", nome: "Vento leve", icone: "wind" },
  { id: "fogueira", nome: "Lareira", icone: "flame" },
  { id: "noite", nome: "Noite no campo", icone: "moon" },
  { id: "piano", nome: "Piano sereno", icone: "note" },
  { id: "pad", nome: "Cordas celestiais", icone: "sparkles" },
  { id: "harpa", nome: "Harpa suave", icone: "rings" },
  { id: "tigelas", nome: "Tigelas de meditação", icone: "prayer" },
];

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// Progressão em Dó maior: Cmaj7 - Am7 - Fmaj7 - G6 (notas MIDI, do grave ao agudo)
const ACORDES = [
  [48, 55, 59, 64, 67],
  [45, 55, 60, 64, 67],
  [41, 53, 57, 60, 64],
  [43, 55, 59, 62, 64],
];
const PENTATONICA = [72, 74, 76, 79, 81, 84, 86]; // Dó maior pentatônica (agudos)

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
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.02;
      comp.release.value = 0.4;
      this.master.connect(comp).connect(this.ctx.destination);
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
  reverb(seg = 4.2) {
    const n = Math.floor(this.ctx.sampleRate * seg);
    const ir = this.ctx.createBuffer(2, n, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const x = i / n;
        const a = 0.15 + 0.75 * x; // a cauda vai ficando mais escura
        y = y * a + (Math.random() * 2 - 1) * (1 - a);
        d[i] = y * Math.pow(1 - x, 3.2) * 2.4;
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = ir;
    return conv;
  }

  /** Nota de piano macio: parciais com decaimentos diferentes, martelo de feltro e leve desafinação. */
  notaPiano(freq, t, vel, destinos, opc = {}) {
    const ctx = this.ctx;
    const brilho = opc.brilho ?? 1;
    const base = Math.min(7, Math.max(1.6, 4.2 * Math.pow(220 / freq, 0.35))) * (opc.dur ?? 1);
    const pesos = [1, 0.55, 0.3, 0.18, 0.1, 0.06];
    const lp = this.filtro("lowpass", 1800 + vel * 4200 * brilho, 0.5);
    lp.frequency.setValueAtTime(1800 + vel * 4200 * brilho, t);
    lp.frequency.exponentialRampToValueAtTime(700 + 400 * brilho, t + base);
    const nota = ctx.createGain();
    nota.gain.value = vel * 0.22;
    lp.connect(nota);
    destinos.forEach((d) => nota.connect(d));
    pesos.forEach((w, k) => {
      [-2.5, 2.5].forEach((cents) => {
        if (k > 1 && cents > 0) return;
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = freq * (k + 1) * (k === 0 ? 1 : 1 + 0.0004 * k * k); // leve inarmonicidade
        o.detune.value = cents;
        const g = ctx.createGain();
        const dec = base / Math.pow(k + 1, 0.75);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(w * (k === 0 ? 0.6 : 1), t + (opc.ataque ?? 0.006));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        o.connect(g).connect(lp);
        o.start(t);
        o.stop(t + dec + 0.1);
      });
    });
    // martelo de feltro (toque curtinho e grave)
    const ruido = ctx.createBufferSource();
    ruido.buffer = this.buffers.rosa || (this.buffers.rosa = bufferDeRuido(ctx, "rosa"));
    const bp = this.filtro("bandpass", Math.min(2400, freq * 2.5), 0.9);
    const gr = ctx.createGain();
    gr.gain.setValueAtTime(vel * 0.5, t);
    gr.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    ruido.connect(bp).connect(gr).connect(lp);
    ruido.start(t, Math.random() * 2);
    ruido.stop(t + 0.08);
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
      const mix = this.ganho(0.8);
      rev.connect(mix).connect(saida);
      const seco = this.ganho(0.55);
      seco.connect(saida);
      const alvos = [rev, seco];
      const batida = 0.62 + Math.random() * 0.1; // ~ 90 bpm, calmo
      let compasso = Math.floor(Math.random() * 4);
      let passo = 0;
      const tocar = () => {
        const ac = ACORDES[compasso % ACORDES.length];
        const t = ctx.currentTime + 0.05;
        if (passo === 0) this.notaPiano(midi(ac[0] - 12), t, 0.55, alvos, { dur: 1.4 });
        // arpejo suave subindo pelas notas do acorde
        const ordem = [1, 2, 3, 4, 3, 2, 4, 3];
        if (passo % 1 === 0 && Math.random() < 0.9) {
          const m = ac[ordem[passo % ordem.length]];
          this.notaPiano(midi(m), t, 0.32 + Math.random() * 0.18, alvos);
        }
        // melodia esparsa na pentatônica
        if (passo % 4 === 2 && Math.random() < 0.7) {
          const m = PENTATONICA[Math.floor(Math.random() * PENTATONICA.length)];
          this.notaPiano(midi(m), t + 0.02, 0.42 + Math.random() * 0.18, alvos, { dur: 1.2, brilho: 1.2 });
        }
        passo++;
        if (passo >= 8) { passo = 0; compasso++; }
        timers.push(setTimeout(tocar, batida * 1000 * (0.97 + Math.random() * 0.06)));
      };
      tocar();
    } else if (id === "harpa") {
      const rev = this.reverb(5);
      rev.connect(this.ganho(1)).connect(saida);
      const seco = this.ganho(0.4);
      seco.connect(saida);
      const alvos = [rev, seco];
      let compasso = 0;
      const arpejo = () => {
        const ac = ACORDES[compasso % ACORDES.length];
        const notas = ac.slice(1).map((m) => m + 12);
        const sobe = Math.random() < 0.6;
        const seq = sobe ? notas : [...notas].reverse();
        const t0 = ctx.currentTime + 0.05;
        seq.forEach((m, i) => this.notaPiano(midi(m), t0 + i * 0.16, 0.34 + Math.random() * 0.12, alvos, { ataque: 0.002, dur: 0.9, brilho: 1.8 }));
        if (Math.random() < 0.5) this.notaPiano(midi(ac[0]), t0, 0.4, alvos, { dur: 1.6 });
        compasso++;
        timers.push(setTimeout(arpejo, 2600 + Math.random() * 1800));
      };
      arpejo();
    } else if (id === "pad") {
      const rev = this.reverb(5.5);
      const mix = this.ganho(0.9);
      rev.connect(mix).connect(saida);
      const seco = this.ganho(0.3);
      seco.connect(saida);
      let i = Math.floor(Math.random() * 4);
      const acorde = () => {
        const ac = ACORDES[i % ACORDES.length];
        i++;
        const t = ctx.currentTime;
        const dur = 9;
        const lp = this.filtro("lowpass", 700, 0.4);
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);
        lp.frequency.linearRampToValueAtTime(600, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.11, t + 3.2);
        g.gain.setValueAtTime(0.11, t + dur - 3.4);
        g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.5);
        lp.connect(g);
        g.connect(rev);
        g.connect(seco);
        ac.forEach((m) => {
          [-9, 0, 9].forEach((cents) => {
            const o = ctx.createOscillator();
            o.type = "sawtooth";
            o.frequency.value = midi(m);
            o.detune.value = cents + (Math.random() * 4 - 2);
            const og = ctx.createGain();
            og.gain.value = 0.55 / (1 + (m - 40) / 24);
            o.connect(og).connect(lp);
            o.start(t);
            o.stop(t + dur + 1.7);
          });
        });
        timers.push(setTimeout(acorde, (dur - 2.2) * 1000));
      };
      acorde();
    } else if (id === "tigelas") {
      const rev = this.reverb(6);
      rev.connect(this.ganho(1)).connect(saida);
      const seco = this.ganho(0.35);
      seco.connect(saida);
      const bases = [130.81, 164.81, 196.0, 261.63, 329.63];
      const bater = () => {
        const f = bases[Math.floor(Math.random() * bases.length)];
        const t = ctx.currentTime + 0.05;
        [[1, 1], [2.76, 0.32], [5.4, 0.12], [8.9, 0.05]].forEach(([r, w]) => {
          [0, 1.7].forEach((bat) => {
            const o = ctx.createOscillator();
            o.type = "sine";
            o.frequency.value = f * r + bat * (r > 1 ? 1.5 : 1);
            const g = ctx.createGain();
            const dec = 11 / Math.pow(r, 0.5);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.24 * w, t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
            o.connect(g);
            g.connect(rev);
            g.connect(seco);
            o.start(t);
            o.stop(t + dec + 0.1);
          });
        });
        timers.push(setTimeout(bater, 6500 + Math.random() * 5500));
      };
      bater();
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
