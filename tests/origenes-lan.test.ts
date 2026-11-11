import test from 'node:test';
import assert from 'node:assert/strict';
import { origenesLanSeguros } from '../src/lib/configuracion/origenes-desarrollo';

function red(address: string, family: string | number='IPv4', internal=false) {
  return { address, family, internal };
}
test('detecta la IP privada de wifi o ethernet sin puertos', () => {
  assert.deepEqual(origenesLanSeguros({en0:[red('192.168.1.35')],en1:[red('10.0.0.8'),red('172.20.5.9')]}),
    ['10.0.0.8','172.20.5.9','192.168.1.35']);
});
test('no admite IP publicas, loopback, IPv6 ni direcciones manipuladas', () => {
  assert.deepEqual(origenesLanSeguros({en0:[red('8.8.8.8'),red('127.0.0.1','IPv4',true),red('fe80::1','IPv6'),red('192.168.1.3:3000'),red('192.168.256.1'),red('172.32.0.1')]}), []);
});
test('ignora interfaces ausentes, deduplica y acepta family numerico', () => {
  assert.deepEqual(origenesLanSeguros({en0:[red('192.168.1.4',4)],en1:[red('192.168.1.4')],en2:undefined}), ['192.168.1.4']);
});
test('no admite comodines ni hostnames inseguros', () => {
  assert.deepEqual(origenesLanSeguros({en0:[red('*.example.com'),red('10.0.0.1/16'),red('192.168.1.000')] }), []);
});
