#!/usr/bin/env python3
"""
Gera o APK Android do Brotim sem precisar do Android SDK completo.

Peças usadas (baixadas do Maven Central para android/.tools/):
  - android.jar  (com.google.android:android:4.1.1.4)  -> compilar o Java
  - dx.jar       (com.jakewharton.android.repackaged:dalvik-dx) -> gerar classes.dex
  - apksig.jar   (com.android.tools.build:apksig)       -> assinar v1+v2

O AndroidManifest.xml binário (AXML) e o resources.arsc (ícone) são
gerados por este script.

Uso:  python3 android/build_apk.py        (a partir da raiz do repositório)
Saída: android/dist/brotim.apk
"""
import os
import shutil
import struct
import subprocess
import sys
import time
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ROOT)
GAME = os.path.join(REPO, 'game')
TOOLS = os.path.join(ROOT, '.tools')
BUILD = os.path.join(ROOT, '.build')
DIST = os.path.join(ROOT, 'dist')
KEYSTORE = os.path.join(ROOT, '.keystore', 'brotim.p12')
KEY_PASS = os.environ.get('BROTIM_KEY_PASS', 'brotim123')
KEY_ALIAS = 'brotim'

PACKAGE = 'com.brotim.jogo'
APP_NAME = 'Brotim'
VERSION_CODE = 1
VERSION_NAME = '1.0'
MIN_SDK = 24   # Android 7.0+ (assinatura v2)
TARGET_SDK = 34

MAVEN = 'https://repo1.maven.org/maven2/'
JARS = {
    'android.jar': 'com/google/android/android/4.1.1.4/android-4.1.1.4.jar',
    'dx.jar': 'com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar',
    'apksig.jar': 'com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar',
}

# IDs de atributos do Android (android.R.attr), conferidos no android.jar
ATTR = {
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003,
    'exported': 0x01010010, 'screenOrientation': 0x0101001e, 'configChanges': 0x0101001f,
    'minSdkVersion': 0x0101020c, 'versionCode': 0x0101021b, 'versionName': 0x0101021c,
    'targetSdkVersion': 0x01010270, 'allowBackup': 0x01010280, 'hardwareAccelerated': 0x010102d3,
}
THEME_FULLSCREEN = 0x0103000a     # @android:style/Theme.Black.NoTitleBar.Fullscreen
ICON_ID = 0x7f010000              # @drawable/ic_launcher (definido no resources.arsc abaixo)
ANDROID_NS = 'http://schemas.android.com/apk/res/android'

# tipos de Res_value
T_REF, T_STRING, T_INT_DEC, T_INT_HEX, T_BOOL = 0x01, 0x03, 0x10, 0x11, 0x12


def run(cmd):
    print('  $', ' '.join(cmd if len(' '.join(cmd)) < 160 else cmd[:4] + ['...']))
    subprocess.run(cmd, check=True)


def download_tools():
    os.makedirs(TOOLS, exist_ok=True)
    for name, path in JARS.items():
        dest = os.path.join(TOOLS, name)
        if os.path.exists(dest):
            continue
        print('baixando', name)
        for attempt in range(6):
            try:
                urllib.request.urlretrieve(MAVEN + path, dest)
                break
            except Exception as e:  # Maven Central às vezes responde 429
                print('  tentativa', attempt + 1, 'falhou:', e)
                time.sleep(3 * (attempt + 1))
        else:
            sys.exit('não foi possível baixar ' + name)


# ---------------------------------------------------------------- string pool
def string_pool(strings, utf8=False):
    offsets, data = [], b''
    for s in strings:
        offsets.append(len(data))
        if utf8:
            b = s.encode('utf-8')
            assert len(s) < 128 and len(b) < 128
            data += bytes([len(s), len(b)]) + b + b'\x00'
        else:
            u = s.encode('utf-16-le')
            data += struct.pack('<H', len(s)) + u + b'\x00\x00'
    while len(data) % 4:
        data += b'\x00'
    header_size = 28
    strings_start = header_size + 4 * len(strings)
    size = strings_start + len(data)
    flags = 0x100 if utf8 else 0
    head = struct.pack('<HHIIIIII', 0x0001, header_size, size, len(strings), 0, flags, strings_start, 0)
    return head + b''.join(struct.pack('<I', o) for o in offsets) + data


# ---------------------------------------------------------------- AXML (manifesto binário)
def build_manifest():
    """Monta o AndroidManifest.xml no formato binário usado dentro do APK."""
    # (nome, [(ns, attr, tipo, valor)], filhos)
    activity = ('activity', [
        (1, 'theme', T_REF, THEME_FULLSCREEN),
        (1, 'label', T_STRING, APP_NAME),
        (1, 'name', T_STRING, '.MainActivity'),
        (1, 'exported', T_BOOL, True),
        (1, 'screenOrientation', T_INT_DEC, 6),           # sensorLandscape
        (1, 'configChanges', T_INT_HEX, 0x0FF0),          # não recria ao girar/redimensionar
        (1, 'hardwareAccelerated', T_BOOL, True),
    ], [
        ('intent-filter', [], [
            ('action', [(1, 'name', T_STRING, 'android.intent.action.MAIN')], []),
            ('category', [(1, 'name', T_STRING, 'android.intent.category.LAUNCHER')], []),
        ]),
    ])
    manifest = ('manifest', [
        (0, 'package', T_STRING, PACKAGE),
        (1, 'versionCode', T_INT_DEC, VERSION_CODE),
        (1, 'versionName', T_STRING, VERSION_NAME),
    ], [
        ('uses-sdk', [(1, 'minSdkVersion', T_INT_DEC, MIN_SDK), (1, 'targetSdkVersion', T_INT_DEC, TARGET_SDK)], []),
        ('application', [
            (1, 'theme', T_REF, THEME_FULLSCREEN),
            (1, 'label', T_STRING, APP_NAME),
            (1, 'icon', T_REF, ICON_ID),
            (1, 'allowBackup', T_BOOL, True),
            (1, 'hardwareAccelerated', T_BOOL, True),
        ], [activity]),
    ])

    # Pool de strings: primeiro os nomes de atributos com ID (na mesma ordem do resource map)
    attr_names = []

    def collect(node):
        for ns, a, t, v in node[1]:
            if ns and a not in attr_names:
                attr_names.append(a)
        for c in node[2]:
            collect(c)
    collect(manifest)
    strings = list(attr_names)

    def idx(s):
        if s not in strings:
            strings.append(s)
        return strings.index(s)

    for s in ['android', ANDROID_NS]:
        idx(s)
    body = []
    body.append(struct.pack('<HHIIIII', 0x0100, 16, 24, 1, 0xFFFFFFFF, idx('android'), idx(ANDROID_NS)))

    def emit(node):
        name, attrs, children = node
        # atributos ordenados pelo ID do recurso (sem ID primeiro), como exige o Android
        attrs = sorted(attrs, key=lambda a: ATTR.get(a[1], 0) if a[0] else 0)
        raw = b''
        for ns, a, t, v in attrs:
            ns_i = idx(ANDROID_NS) if ns else 0xFFFFFFFF
            name_i = idx(a)
            if t == T_STRING:
                si = idx(v)
                raw_v, data = si, si
            elif t == T_BOOL:
                raw_v, data = 0xFFFFFFFF, 0xFFFFFFFF if v else 0
            else:
                raw_v, data = 0xFFFFFFFF, v
            raw += struct.pack('<IIIHBBI', ns_i, name_i, raw_v, 8, 0, t, data)
        size = 36 + len(raw)
        body.append(struct.pack('<HHIIIIIHHHHHH', 0x0102, 16, size, 1, 0xFFFFFFFF, 0xFFFFFFFF, idx(name),
                                20, 20, len(attrs), 0, 0, 0) + raw)
        for c in children:
            emit(c)
        body.append(struct.pack('<HHIIIII', 0x0103, 16, 24, 1, 0xFFFFFFFF, 0xFFFFFFFF, idx(name)))

    emit(manifest)
    body.append(struct.pack('<HHIIIII', 0x0101, 16, 24, 1, 0xFFFFFFFF, idx('android'), idx(ANDROID_NS)))

    pool = string_pool(strings)
    resmap = struct.pack('<HHI', 0x0180, 8, 8 + 4 * len(attr_names)) + b''.join(struct.pack('<I', ATTR[a]) for a in attr_names)
    content = pool + resmap + b''.join(body)
    return struct.pack('<HHI', 0x0003, 8, 8 + len(content)) + content


# ---------------------------------------------------------------- resources.arsc (só o ícone)
def build_arsc():
    values = string_pool(['res/drawable-nodpi-v4/ic_launcher.png'], utf8=True)
    type_strings = string_pool(['drawable'])
    key_strings = string_pool(['ic_launcher'])

    type_spec = struct.pack('<HHIBBHI', 0x0202, 16, 16 + 4, 1, 0, 0, 1) + struct.pack('<I', 0)

    config = bytearray(64)
    struct.pack_into('<I', config, 0, 64)
    struct.pack_into('<H', config, 14, 0xFFFF)     # density = nodpi
    struct.pack_into('<H', config, 24, 4)          # sdkVersion = 4 (sufixo -v4)
    header_size = 20 + len(config)
    entries_start = header_size + 4
    entry = struct.pack('<HHI', 8, 0, 0) + struct.pack('<HBBI', 8, 0, T_STRING, 0)
    type_chunk = struct.pack('<HHIBBHII', 0x0201, header_size, entries_start + len(entry), 1, 0, 0, 1, entries_start) \
        + bytes(config) + struct.pack('<I', 0) + entry

    name = PACKAGE.encode('utf-16-le').ljust(256, b'\x00')
    pkg_header = 288
    type_off = pkg_header
    key_off = type_off + len(type_strings)
    pkg_body = type_strings + key_strings + type_spec + type_chunk
    package = struct.pack('<HHII', 0x0200, pkg_header, pkg_header + len(pkg_body), 0x7f) + name \
        + struct.pack('<IIIII', type_off, 1, key_off, 1, 0) + pkg_body

    content = values + package
    return struct.pack('<HHII', 0x0002, 12, 12 + len(content), 1) + content


# ---------------------------------------------------------------- zip alinhado
class AlignedZip:
    """Arquivos sem compressão ficam alinhados em 4 bytes (como o zipalign)."""
    def __init__(self, path):
        self.z = zipfile.ZipFile(path, 'w')

    def add(self, arcname, data, compress=True):
        info = zipfile.ZipInfo(arcname, date_time=(2026, 1, 1, 0, 0, 0))
        info.create_system = 0
        if compress:
            info.compress_type = zipfile.ZIP_DEFLATED
        else:
            info.compress_type = zipfile.ZIP_STORED
            offset = self.z.fp.tell() + 30 + len(arcname.encode('utf-8'))
            info.extra = b'\x00' * ((4 - offset % 4) % 4)
        self.z.writestr(info, data)

    def close(self):
        self.z.close()


def main():
    download_tools()
    shutil.rmtree(BUILD, ignore_errors=True)
    os.makedirs(os.path.join(BUILD, 'classes'))
    os.makedirs(DIST, exist_ok=True)
    jar = lambda n: os.path.join(TOOLS, n)

    print('1/5 compilando Java')
    srcs = []
    for d, _, files in os.walk(os.path.join(ROOT, 'src')):
        srcs += [os.path.join(d, f) for f in files if f.endswith('.java')]
    # java.* vem do JDK (modo Java 8); android.* vem do android.jar
    run(['javac', '-nowarn', '-Xlint:-options', '--release', '8', '-encoding', 'UTF-8',
         '-cp', jar('android.jar'), '-d', os.path.join(BUILD, 'classes')] + srcs)

    print('2/5 gerando classes.dex')
    run(['java', '-cp', jar('dx.jar'), 'com.android.dx.command.Main', '--dex', '--min-sdk-version=' + str(MIN_SDK),
         '--output=' + os.path.join(BUILD, 'classes.dex'), os.path.join(BUILD, 'classes')])

    print('3/5 montando o APK (manifesto, recursos, jogo)')
    unsigned = os.path.join(BUILD, 'unsigned.apk')
    z = AlignedZip(unsigned)
    z.add('AndroidManifest.xml', build_manifest())
    z.add('classes.dex', open(os.path.join(BUILD, 'classes.dex'), 'rb').read())
    z.add('resources.arsc', build_arsc(), compress=False)
    z.add('res/drawable-nodpi-v4/ic_launcher.png', open(os.path.join(ROOT, 'res', 'ic_launcher.png'), 'rb').read(), compress=False)
    for d, _, files in os.walk(GAME):
        for f in sorted(files):
            if f.startswith('.'):
                continue
            full = os.path.join(d, f)
            z.add('assets/game/' + os.path.relpath(full, GAME).replace(os.sep, '/'), open(full, 'rb').read())
    z.close()

    print('4/5 chave de assinatura')
    if not os.path.exists(KEYSTORE):
        os.makedirs(os.path.dirname(KEYSTORE), exist_ok=True)
        run(['keytool', '-genkeypair', '-keystore', KEYSTORE, '-storetype', 'PKCS12', '-storepass', KEY_PASS,
             '-keypass', KEY_PASS, '-alias', KEY_ALIAS, '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
             '-dname', 'CN=Brotim, O=Brotim, C=BR'])

    print('5/5 assinando (v2)')
    signer_dir = os.path.join(BUILD, 'signer')
    run(['javac', '-nowarn', '-cp', jar('apksig.jar'), '-d', signer_dir, os.path.join(ROOT, 'tools', 'SignApk.java')])
    out = os.path.join(DIST, 'brotim.apk')
    # a apksig 2.3.0 usa classes internas do JDK (sun.security.*)
    opens = ['--add-exports=java.base/sun.security.x509=ALL-UNNAMED', '--add-exports=java.base/sun.security.pkcs=ALL-UNNAMED',
             '--add-exports=java.base/sun.security.util=ALL-UNNAMED']
    run(['java'] + opens + ['-cp', signer_dir + os.pathsep + jar('apksig.jar'), 'SignApk', KEYSTORE, KEY_PASS, KEY_ALIAS,
         unsigned, out, str(MIN_SDK)])
    print('\nPronto:', out, '(%.0f KB)' % (os.path.getsize(out) / 1024))


if __name__ == '__main__':
    main()
