import { expect } from "chai";
import { describe, skip } from "razmin";
import { BitstreamReader } from "./reader";

describe('BitstreamReader', it => {
    it('can read a byte-aligned byte', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([123]));

        expect(bitstream.readSync(8)).to.equal(123);
    });

    it('bufferIndex is always zero when retainBuffers=false', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.addBuffer(Buffer.from([123, 123]));
        bitstream.addBuffer(Buffer.from([123]));

        expect(bitstream.bufferIndex === 0);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex === 0);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex === 0);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex === 0);
    });
    it('.clean() causes buffers to be discarded when retainBuffers=true', () => {
        let bitstream = new BitstreamReader();
        bitstream.retainBuffers = true;
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.addBuffer(Buffer.from([123, 123]));
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.readSync(8);
        expect(bitstream.bufferIndex).to.equal(1);
        expect(bitstream.offset).to.equal(8);
        bitstream.clean();
        expect(bitstream.bufferIndex).to.equal(0);
        expect(bitstream.offset).to.equal(8);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex).to.equal(0);
        expect(bitstream.offset).to.equal(16);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex).to.equal(1);
        expect(bitstream.offset).to.equal(24);
        bitstream.readSync(8);
        bitstream.clean();
        expect(bitstream.bufferIndex).to.equal(0);
        expect(bitstream.offset).to.equal(32);
    });
    it('.clean() frees only the number of requested buffers', () => {
        let bitstream = new BitstreamReader();
        bitstream.retainBuffers = true;
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.addBuffer(Buffer.from([123, 123]));

        bitstream.readSync(8);
        bitstream.readSync(8);
        bitstream.readSync(8);

        expect(bitstream.bufferIndex).to.equal(3);
        bitstream.clean(1);
        expect(bitstream.bufferIndex).to.equal(2);
        bitstream.clean(1);
        expect(bitstream.bufferIndex).to.equal(1);
        bitstream.clean(1);
        expect(bitstream.bufferIndex).to.equal(0);
    });
    it('spentBufferSize tracks read bits properly', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.addBuffer(Buffer.from([123, 123]));
        bitstream.addBuffer(Buffer.from([123]));

        expect(bitstream.spentBufferSize === 0);
        bitstream.readSync(8);
        expect(bitstream.spentBufferSize === 8);
        bitstream.readSync(8);
        expect(bitstream.spentBufferSize === 8);
        bitstream.readSync(8);
        expect(bitstream.spentBufferSize === 24);
    });
    it('offset should start at zero', () => {
        let bitstream = new BitstreamReader();
        expect(bitstream.offset).to.equal(0);
        bitstream.addBuffer(Buffer.from([1, 2, 3, 4, 5, 6]));
        expect(bitstream.offset).to.equal(0);
    });
    it('offset should not move as buffers are added', () => {
        let bitstream = new BitstreamReader();
        expect(bitstream.offset).to.equal(0);
        bitstream.addBuffer(Buffer.from([1, 2, 3, 4, 5, 6]));
        expect(bitstream.offset).to.equal(0);
        bitstream.readSync(8);
        bitstream.addBuffer(Buffer.from([1, 2, 3, 4, 5, 6]));
        expect(bitstream.offset).to.equal(8);
    });
    it('setting offset allows seeking within current buffer', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([1, 2, 3, 4, 5, 6]));

        expect(bitstream.readSync(8)).to.equal(1);
        expect(bitstream.readSync(8)).to.equal(2);
        expect(bitstream.readSync(8)).to.equal(3);

        bitstream.offset = 0;
        expect(bitstream.readSync(8)).to.equal(1);
        expect(bitstream.readSync(8)).to.equal(2);
        expect(bitstream.readSync(8)).to.equal(3);

        bitstream.offset = 8;
        expect(bitstream.readSync(8)).to.equal(2);
        expect(bitstream.readSync(8)).to.equal(3);
        expect(bitstream.readSync(8)).to.equal(4);

        bitstream.offset = 0;
        expect(bitstream.readSync(8)).to.equal(1);
        expect(bitstream.readSync(8)).to.equal(2);
        expect(bitstream.readSync(8)).to.equal(3);
    });
    it('setting offset allows seeking into previous buffers when retainBuffers=true', () => {
        let bitstream = new BitstreamReader();
        bitstream.retainBuffers = true;
        bitstream.addBuffer(Buffer.from([1, 2, 3]));
        bitstream.addBuffer(Buffer.from([4, 5, 6]));

        expect(bitstream.readSync(8)).to.equal(1);
        expect(bitstream.readSync(8)).to.equal(2);
        expect(bitstream.readSync(8)).to.equal(3);
        expect(bitstream.readSync(8)).to.equal(4);
        expect(bitstream.readSync(8)).to.equal(5);
        expect(bitstream.readSync(8)).to.equal(6);

        bitstream.offset = 8 * 3;
        expect(bitstream.readSync(8)).to.equal(4);
        expect(bitstream.readSync(8)).to.equal(5);
        expect(bitstream.readSync(8)).to.equal(6);

        bitstream.offset = 0;
        expect(bitstream.readSync(8)).to.equal(1);
        expect(bitstream.readSync(8)).to.equal(2);
        expect(bitstream.readSync(8)).to.equal(3);
    });
    it('setting offset into discarded buffers should throw when retainBuffers=false', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([1, 2, 3]));
        bitstream.addBuffer(Buffer.from([4, 5, 6]));

        expect(bitstream.readSync(8)).to.equal(1);
        expect(bitstream.readSync(8)).to.equal(2);
        expect(bitstream.readSync(8)).to.equal(3);
        expect(bitstream.readSync(8)).to.equal(4);
        expect(bitstream.readSync(8)).to.equal(5);
        expect(bitstream.readSync(8)).to.equal(6);

        let caught;
        try {
            bitstream.offset = 0;
        } catch (e) { caught = e; }

        expect(caught).to.exist;
    });
    it('offset is always increasing even when retainBuffers=false', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.addBuffer(Buffer.from([123, 123]));
        bitstream.addBuffer(Buffer.from([123]));

        expect(bitstream.offset === 0);
        bitstream.readSync(8);
        expect(bitstream.offset === 8);
        bitstream.readSync(8);
        expect(bitstream.offset === 16);
        bitstream.readSync(8);
        expect(bitstream.offset === 24);
    });
    it('bufferIndex grows when retainBuffers=true', () => {
        let bitstream = new BitstreamReader();
        bitstream.retainBuffers = true;
        bitstream.addBuffer(Buffer.from([123]));
        bitstream.addBuffer(Buffer.from([123, 123]));
        bitstream.addBuffer(Buffer.from([123]));

        expect(bitstream.bufferIndex === 0);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex === 1);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex === 1);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex === 2);
    });
    it('can correctly deserialize a simple example from a single buffer', () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(Buffer.from([
            0b11001000,
            0b01010100,
            0b11101001,

            0b01100100,
            0b10001110,
            0b11110000,
            0b10010000
        ]));

        expect(bitstream.readSync(1)).to.equal(0b1);
        expect(bitstream.readSync(3)).to.equal(0b100);
        expect(bitstream.readSync(5)).to.equal(0b10000);

        expect(bitstream.readSync(1)).to.equal(0b1);
        expect(bitstream.readSync(5)).to.equal(0b01010);
        expect(bitstream.readSync(1)).to.equal(0b0);

        expect(bitstream.readSync(8)).to.equal(0b11101001);

        expect(bitstream.readSync(11)).to.equal(0b01100100100);
        expect(bitstream.readSync(5)).to.equal(0b01110);

        expect(bitstream.readSync(16, 'little-endian')).to.equal(0b1001000011110000);
    });
    it('can correctly deserialize a simple example from multiple buffers', () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(Buffer.from([0b11001000, 0b01010100]));
        bitstream.addBuffer(Buffer.from([0b11101001, 0b01100100, 0b10001110]));
        bitstream.addBuffer(Buffer.from([0b11110000, 0b10010000]));

        expect(bitstream.readSync(1)).to.equal(0b1);
        expect(bitstream.readSync(3)).to.equal(0b100);
        expect(bitstream.readSync(4)).to.equal(0b1000);

        expect(bitstream.readSync(2)).to.equal(0b01);
        expect(bitstream.readSync(5)).to.equal(0b01010);
        expect(bitstream.readSync(2)).to.equal(0b01);

        expect(bitstream.readSync(7)).to.equal(0b1101001);

        expect(bitstream.readSync(11)).to.equal(0b01100100100);
        expect(bitstream.readSync(5)).to.equal(0b01110);

        expect(bitstream.readSync(16, 'little-endian')).to.equal(0b1001000011110000);
    });

    it('can read fixed length UTF-8 strings', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from('hello', 'utf-8'));
        let str = bitstream.readStringSync(5);
        expect(str).to.equal('hello');
    });

    it('can read null-terminated fixed length UTF-8 strings', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(5, 0);
        Buffer.from('hi', 'utf-8').copy(buf);

        bitstream.addBuffer(buf);
        let str = bitstream.readStringSync(5);
        expect(str).to.equal('hi');
    });

    it('respects nullTerminated=false when reading strings', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(5, 0);
        Buffer.from('hi', 'utf-8').copy(buf);

        bitstream.addBuffer(buf);
        let str = bitstream.readStringSync(5, { nullTerminated: false });
        expect(str).to.equal('hi\u0000\u0000\u0000');
    });

    it('correctly handles intra-byte skips', () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(Buffer.from([0b11001010, 0b01010100]));
        bitstream.addBuffer(Buffer.from([0b11101001, 0b01100100, 0b10001110]));

        expect(bitstream.readSync(1)).to.equal(0b1);
        expect(bitstream.readSync(3)).to.equal(0b100);
        bitstream.skip(1);
        expect(bitstream.readSync(3)).to.equal(0b010);

        bitstream.skip(2);
        expect(bitstream.readSync(5)).to.equal(0b01010);
        expect(bitstream.readSync(2)).to.equal(0b01);

        bitstream.skip(1);
        expect(bitstream.readSync(6)).to.equal(0b101001);

        expect(bitstream.readSync(10)).to.equal(0b0110010010);
        bitstream.skip(1);
        expect(bitstream.readSync(5)).to.equal(0b01110);
    });
    it('correctly handles inter-byte skips', () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(Buffer.from([0b11001010, 0b01010100]));
        bitstream.addBuffer(Buffer.from([0b11101001, 0b01100100, 0b10001110]));

        expect(bitstream.readSync(1)).to.equal(0b1);
        expect(bitstream.readSync(3)).to.equal(0b100);
        bitstream.skip(1);
        expect(bitstream.readSync(1)).to.equal(0b0);

        bitstream.skip(4);
        expect(bitstream.readSync(5)).to.equal(0b01010);
        expect(bitstream.readSync(2)).to.equal(0b01);

        bitstream.skip(1);
        expect(bitstream.readSync(6)).to.equal(0b101001);

        expect(bitstream.readSync(10)).to.equal(0b0110010010);
        bitstream.skip(1);
        expect(bitstream.readSync(5)).to.equal(0b01110);
    });
    it('correctly handles large inter-byte skips', () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(Buffer.from([0b11001010, 0b01010100]));
        bitstream.addBuffer(Buffer.from([0b11101001, 0b01100100, 0b10001110]));

        expect(bitstream.readSync(1)).to.equal(0b1);
        expect(bitstream.readSync(3)).to.equal(0b100);
        bitstream.skip(14);
        expect(bitstream.readSync(6)).to.equal(0b101001);
        expect(bitstream.readSync(10)).to.equal(0b0110010010);
        bitstream.skip(1);
        expect(bitstream.readSync(5)).to.equal(0b01110);
    });
    it('peeks correctly', () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(Buffer.from([0b11001010, 0b01010100]));

        expect(bitstream.peekSync(4)).to.equal(0b1100);
        expect(bitstream.readSync(1)).to.equal(0b1);
        expect(bitstream.readSync(3)).to.equal(0b100);
        expect(bitstream.peekSync(8)).to.equal(0b10100101);
        expect(bitstream.readSync(1)).to.equal(0b1);
        expect(bitstream.readSync(3)).to.equal(0b010);
        expect(bitstream.peekSync(2)).to.equal(0b01);
        expect(bitstream.readSync(4)).to.equal(0b0101);
        expect(bitstream.readSync(4)).to.equal(0b0100);
    });

    it('.readSync() correctly handles unsigned integers', () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(Buffer.from([0xFB])); expect(bitstream.readSync(8)).to.equal(0xFB);
        bitstream.addBuffer(Buffer.from([5])); expect(bitstream.readSync(8)).to.equal(5);
        bitstream.addBuffer(Buffer.from([0])); expect(bitstream.readSync(8)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFC, 0x0A])); expect(bitstream.readSync(16)).to.equal(0xFC0A);
        bitstream.addBuffer(Buffer.from([0x03, 0xF6])); expect(bitstream.readSync(16)).to.equal(0x03F6);
        bitstream.addBuffer(Buffer.from([0, 0])); expect(bitstream.readSync(16)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x0A, 0xFC])); expect(bitstream.readSync(16, 'little-endian')).to.equal(0xFC0A);
        bitstream.addBuffer(Buffer.from([0xF6, 0x03])); expect(bitstream.readSync(16, 'little-endian')).to.equal(0x03F6);
        bitstream.addBuffer(Buffer.from([0, 0])); expect(bitstream.readSync(16, 'little-endian')).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFF, 0xFE, 0x70, 0x40])); expect(bitstream.readSync(32)).to.equal(0xFFFE7040);
        bitstream.addBuffer(Buffer.from([0x00, 0x01, 0x8F, 0xC0])); expect(bitstream.readSync(32)).to.equal(0x00018FC0);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(bitstream.readSync(32)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x40, 0x70, 0xFE, 0xFF])); expect(bitstream.readSync(32, 'little-endian')).to.equal(0xFFFE7040);
        bitstream.addBuffer(Buffer.from([0xC0, 0x8F, 0x01, 0x00])); expect(bitstream.readSync(32, 'little-endian')).to.equal(0x00018FC0);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(bitstream.readSync(32)).to.equal(0);
    });
    it('.read() correctly handles unsigned integers', async () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([0xFB])); expect(await bitstream.read(8)).to.equal(0xFB);
        bitstream.addBuffer(Buffer.from([5])); expect(await bitstream.read(8)).to.equal(5);
        bitstream.addBuffer(Buffer.from([0])); expect(await bitstream.read(8)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x0A, 0xFC])); expect(await bitstream.read(16)).to.equal(0x0AFC);
        bitstream.addBuffer(Buffer.from([0xF6, 0x03])); expect(await bitstream.read(16)).to.equal(0xF603);
        bitstream.addBuffer(Buffer.from([0, 0])); expect(await bitstream.read(16)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFC, 0x0A])); expect(await bitstream.read(16, 'little-endian')).to.equal(0x0AFC);
        bitstream.addBuffer(Buffer.from([0x03, 0xF6])); expect(await bitstream.read(16, 'little-endian')).to.equal(0xF603);
        bitstream.addBuffer(Buffer.from([0, 0])); expect(await bitstream.read(16, 'little-endian')).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFF, 0xFE, 0x70, 0x40])); expect(await bitstream.read(32)).to.equal(0xFFFE7040);
        bitstream.addBuffer(Buffer.from([0x00, 0x01, 0x8F, 0xC0])); expect(await bitstream.read(32)).to.equal(0x00018FC0);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(await bitstream.read(32)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x40, 0x70, 0xFE, 0xFF])); expect(await bitstream.read(32, 'little-endian')).to.equal(0xFFFE7040);
        bitstream.addBuffer(Buffer.from([0xC0, 0x8F, 0x01, 0x00])); expect(await bitstream.read(32, 'little-endian')).to.equal(0x00018FC0);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(await bitstream.read(32)).to.equal(0);
    });

    it('.readSignedSync() correctly handles signed integers', () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(Buffer.from([0xFB])); expect(bitstream.readSignedSync(8)).to.equal(-5);
        bitstream.addBuffer(Buffer.from([5])); expect(bitstream.readSignedSync(8)).to.equal(5);
        bitstream.addBuffer(Buffer.from([0])); expect(bitstream.readSignedSync(8)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFC, 0x0A])); expect(bitstream.readSignedSync(16)).to.equal(-1014);
        bitstream.addBuffer(Buffer.from([0x03, 0xF6])); expect(bitstream.readSignedSync(16)).to.equal(1014);
        bitstream.addBuffer(Buffer.from([0, 0])); expect(bitstream.readSignedSync(16)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x0A, 0xFC])); expect(bitstream.readSignedSync(16, 'little-endian')).to.equal(-1014);
        bitstream.addBuffer(Buffer.from([0xF6, 0x03])); expect(bitstream.readSignedSync(16, 'little-endian')).to.equal(1014);
        bitstream.addBuffer(Buffer.from([0, 0])); expect(bitstream.readSignedSync(16, 'big-endian')).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFF, 0xFE, 0x70, 0x40])); expect(bitstream.readSignedSync(32)).to.equal(-102336);
        bitstream.addBuffer(Buffer.from([0x00, 0x01, 0x8F, 0xC0])); expect(bitstream.readSignedSync(32)).to.equal(102336);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(bitstream.readSignedSync(32)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x40, 0x70, 0xFE, 0xFF])); expect(bitstream.readSignedSync(32, 'little-endian')).to.equal(-102336);
        bitstream.addBuffer(Buffer.from([0xC0, 0x8F, 0x01, 0x00])); expect(bitstream.readSignedSync(32, 'little-endian')).to.equal(102336);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(bitstream.readSignedSync(32, 'little-endian')).to.equal(0);
    });
    it('.readSigned() correctly handles signed integers', async () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([0xFB])); expect(await bitstream.readSigned(8)).to.equal(-5);
        bitstream.addBuffer(Buffer.from([5])); expect(await bitstream.readSigned(8)).to.equal(5);
        bitstream.addBuffer(Buffer.from([0])); expect(await bitstream.readSigned(8)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFC, 0x0A])); expect(await bitstream.readSigned(16)).to.equal(-1014);
        bitstream.addBuffer(Buffer.from([0x03, 0xF6])); expect(await bitstream.readSigned(16)).to.equal(1014);
        bitstream.addBuffer(Buffer.from([0, 0])); expect(await bitstream.readSigned(16)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFC, 0x0A].reverse())); expect(await bitstream.readSigned(16, 'little-endian')).to.equal(-1014);
        bitstream.addBuffer(Buffer.from([0x03, 0xF6].reverse())); expect(await bitstream.readSigned(16, 'little-endian')).to.equal(1014);
        bitstream.addBuffer(Buffer.from([0, 0])); expect(await bitstream.readSigned(16, 'little-endian')).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xFF, 0xFE, 0x70, 0x40])); expect(await bitstream.readSigned(32)).to.equal(-102336);
        bitstream.addBuffer(Buffer.from([0x00, 0x01, 0x8F, 0xC0])); expect(await bitstream.readSigned(32)).to.equal(102336);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(await bitstream.readSigned(32)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x40, 0x70, 0xFE, 0xFF])); expect(await bitstream.readSigned(32, 'little-endian')).to.equal(-102336);
        bitstream.addBuffer(Buffer.from([0xC0, 0x8F, 0x01, 0x00])); expect(await bitstream.readSigned(32, 'little-endian')).to.equal(102336);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(await bitstream.readSigned(32, 'little-endian')).to.equal(0);
    });
    it('.readSigned() can wait until data is available', async () => {
        let bitstream = new BitstreamReader();
        setTimeout(() => bitstream.addBuffer(Buffer.from([0xFB])), 10);
        expect(await bitstream.readSigned(8)).to.equal(-5);
    });

    it('.readFloatSync() correctly handles floats', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([0x42, 0xCD, 0x00, 0x00])); expect(bitstream.readFloatSync(32)).to.equal(102.5);
        bitstream.addBuffer(Buffer.from([0xC3, 0xDA, 0x00, 0x00])); expect(bitstream.readFloatSync(32)).to.equal(-436);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(bitstream.readFloatSync(32)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x41, 0x60, 0xae, 0x29, 0x71, 0xeb, 0x85, 0x1f]));
        expect(bitstream.readFloatSync(64)).to.equal(8745291.56);

        bitstream.addBuffer(Buffer.from([0xc1, 0x14, 0x00, 0xa4, 0xae, 0x14, 0x7a, 0xe1]));
        expect(bitstream.readFloatSync(64)).to.equal(-327721.17);

        bitstream.addBuffer(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]));
        expect(bitstream.readFloatSync(64)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xe1, 0x7a, 0x14, 0xae, 0xa4, 0x00, 0x14, 0xc1]));
        expect(bitstream.readFloatSync(64, 'little-endian')).to.equal(-327721.17);

    });

    it('.readFloat() correctly handles floats', async () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([0x42, 0xCD, 0x00, 0x00])); expect(await bitstream.readFloat(32)).to.equal(102.5);
        bitstream.addBuffer(Buffer.from([0xC3, 0xDA, 0x00, 0x00])); expect(await bitstream.readFloat(32)).to.equal(-436);
        bitstream.addBuffer(Buffer.from([0, 0, 0, 0])); expect(await bitstream.readFloat(32)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0x41, 0x60, 0xae, 0x29, 0x71, 0xeb, 0x85, 0x1f]));
        expect(await bitstream.readFloat(64)).to.equal(8745291.56);

        bitstream.addBuffer(Buffer.from([0xc1, 0x14, 0x00, 0xa4, 0xae, 0x14, 0x7a, 0xe1]));
        expect(await bitstream.readFloat(64)).to.equal(-327721.17);

        bitstream.addBuffer(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]));
        expect(await bitstream.readFloat(64)).to.equal(0);

        bitstream.addBuffer(Buffer.from([0xe1, 0x7a, 0x14, 0xae, 0xa4, 0x00, 0x14, 0xc1]));
        expect(await bitstream.readFloat(64, 'little-endian')).to.equal(-327721.17);
    });

    it('.readFloat() can wait until data is available', async () => {
        let bitstream = new BitstreamReader();
        setTimeout(() => bitstream.addBuffer(Buffer.from([0x42, 0xCD, 0x00, 0x00])), 10);
        expect(await bitstream.readFloat(32)).to.equal(102.5);
    });

    it('.readFloatSync() throws when requesting lengths other than 32 or 64', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.alloc(32));

        let caught;
        try {
            bitstream.readFloatSync(13);
        } catch (e) { caught = e; }

        expect(caught).to.exist;
    });

    it('peek() reads an unsigned integer without consuming it', async () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([37]));

        expect(await bitstream.peek(8)).to.equal(37);
        expect(bitstream.offset).to.equal(0);
        expect(await bitstream.peek(8)).to.equal(37);
        expect(await bitstream.peek(8)).to.equal(37);
        expect(await bitstream.peek(8)).to.equal(37);
        expect(await bitstream.peek(8)).to.equal(37);
        expect(await bitstream.peek(8)).to.equal(37);
        expect(bitstream.offset).to.equal(0);
    });

    it('.readFloatSync() throws when not enough bits are available', () => {
        let bitstream = new BitstreamReader();

        let caught;
        try {
            bitstream.readFloatSync(32);
        } catch (e) { caught = e; }

        expect(caught).to.exist;
    });

    it('readSync() throws when not enough bits are available', () => {
        let bitstream = new BitstreamReader();
        let caught;

        try {
            bitstream.readSync(32);
        } catch (e) { caught = e; }

        expect(caught).to.exist;
    });

    it('.readSignedSync() throws when not enough bits are available', () => {
        let bitstream = new BitstreamReader();
        let caught;

        try {
            bitstream.readSignedSync(32);
        } catch (e) { caught = e; }

        expect(caught).to.exist;
    });

    it('.read() fast paths when enough bits are available', async () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.alloc(1));

        let promise = bitstream.read(8);
        expect(bitstream['blockedRequest']).to.be.null;
        expect(await promise).to.equal(0);
    });

    it('.read() can wait until enough bits are available', async () => {
        let bitstream = new BitstreamReader();
        setTimeout(() => bitstream.addBuffer(Buffer.from([12])), 10);
        expect(await bitstream.read(8)).to.equal(12);
    });

    it('correctly handles NaN', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([0x7F, 0xC0, 0x00, 0x00])); expect(bitstream.readFloatSync(32)).to.be.NaN;

        bitstream.addBuffer(Buffer.from([0x7f, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
        expect(bitstream.readFloatSync(64)).to.be.NaN;
    });

    it('correctly handles Infinity', () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([0x7f, 0x80, 0x00, 0x00]));
        expect(bitstream.readFloatSync(32)).not.to.be.finite;

        bitstream.addBuffer(Buffer.from([0x7f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
        expect(bitstream.readFloatSync(64)).not.to.be.finite;

        bitstream.addBuffer(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x7f]));
        expect(bitstream.readFloatSync(64, 'little-endian')).not.to.be.finite;
    });
    it('.read() allows only one async read at a time', async () => {
        let bitstream = new BitstreamReader();
        bitstream.read(8);

        let caught;
        try {
            await bitstream.read(8);
        } catch (e) { caught = e; }

        expect(caught, `Expected read() to throw`).to.exist;
    });
    it('.assure() allows only one async call at a time', async () => {
        let bitstream = new BitstreamReader();
        bitstream.assure(8);

        let caught;
        try {
            await bitstream.assure(8);
        } catch (e) { caught = e; }

        expect(caught, `Expected assure() to throw`).to.exist;
    });
    it('.readStringSync() reads a string correctly', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(10);
        buf.write('hello', 'utf-8');

        bitstream.addBuffer(buf);
        expect(bitstream.readStringSync(10)).to.equal('hello');
    });
    it('.readStringSync() reads a non-null-terminated string correctly', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(10);
        buf.write('hello', 'utf-8');

        bitstream.addBuffer(buf);
        expect(bitstream.readStringSync(10, { nullTerminated: false })).to.equal("hello\0\0\0\0\0");
    });
    it('.readStringSync() reads an ASCII string correctly', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(10);
        buf.write('hello', 'ascii');
        bitstream.addBuffer(buf);
        expect(bitstream.readStringSync(10)).to.equal("hello");
    });
    it('.readStringSync() reads utf16le correctly', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(32);
        buf.write('hello', 'utf16le');
        bitstream.addBuffer(buf);
        expect(bitstream.readStringSync(16, { encoding: 'utf16le' })).to.equal("hello");
    });
    it('.readStringSync() reads ucs-2 correctly', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(32);
        buf.write('hello', 'ucs-2');
        bitstream.addBuffer(buf);
        expect(bitstream.readStringSync(16, { encoding: 'ucs-2' })).to.equal("hello");
    });
    it('.readStringSync() detects string terminator even when half the last character is missing', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(32);
        buf.write('hello', 'ucs-2');
        bitstream.addBuffer(buf);
        expect(bitstream.readStringSync(11, { encoding: 'ucs-2' })).to.equal("hello");
    });
    it('.readStringSync() throws with an invalid encoding', () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(32);
        buf.write('hello', 'ucs-2');
        bitstream.addBuffer(buf);

        let caught;
        try {
            bitstream.readStringSync(16, { encoding: 'not-a-real-encoding' });
        } catch (e) { caught = e; }

        expect(caught).to.exist;
    });
    it('.readStringSync() throws with any encoding other than utf-8 when Buffer is not available', () => {

        let buf = Buffer.alloc(32);
        const BufferT = Buffer;
        (globalThis as any).Buffer = undefined;
        try {
            let bitstream = new BitstreamReader();
            buf.write('hello', 'utf16le');
            bitstream.addBuffer(buf);

            let caught;
            try {
                bitstream.readStringSync(16, { encoding: 'utf16le' });
            } catch (e) { caught = e; }

            expect(caught).to.exist;
        } finally {
            (globalThis as any).Buffer = BufferT;
        }
    });
    it('.readStringSync() supports utf-8 even when Buffer is not present', () => {

        let buf = Buffer.alloc(32);
        const BufferT = Buffer;
        (globalThis as any).Buffer = undefined;
        try {
            let bitstream = new BitstreamReader();
            buf.write('hello', 'utf-8');
            bitstream.addBuffer(buf);
            expect(bitstream.readStringSync(16, { encoding: 'utf-8' })).to.equal('hello');
        } finally {
            (globalThis as any).Buffer = BufferT;
        }
    });
    it('.readString() reads a string correctly when the data is already available', async () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(10);
        buf.write('hello', 'utf-8');

        bitstream.addBuffer(buf);
        expect(await bitstream.readString(10)).to.equal('hello');
    });
    it('.readString() reads a string correctly when the data is not yet available', async () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.alloc(10);
        buf.write('hello', 'utf-8');

        setTimeout(() => bitstream.addBuffer(buf), 10);
        expect(await bitstream.readString(10)).to.equal('hello');
    });
    it('.readBytes() reads a buffer correctly when the data is already available', async () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.from([12, 42, 15]);
        bitstream.addBuffer(buf);

        let buf2 = Buffer.alloc(3);
        await bitstream.readBytesBlocking(buf2);
        expect(Array.from(buf2)).to.eql([12, 42, 15]);
    });
    it('.readBytes() reads a buffer correctly when the data is already available', async () => {
        let bitstream = new BitstreamReader();
        let buf = Buffer.from([12, 42, 15]);
        setTimeout(() => bitstream.addBuffer(buf), 10);

        let buf2 = Buffer.alloc(3);
        await bitstream.readBytesBlocking(buf2);
        expect(Array.from(buf2)).to.eql([12, 42, 15]);
    });
    it('.addBuffer() throws when called on an ended stream', async () => {
        let bitstream = new BitstreamReader();
        expect(() => bitstream.addBuffer(new Uint8Array(1))).not.to.throw;
        bitstream.end();
        expect(() => bitstream.addBuffer(new Uint8Array(1))).to.throw;
    });
    it('.simulate() restores offset after execution', async () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(new Uint8Array(2));
        bitstream.readSync(4);

        await bitstream.simulate(async () => {
            bitstream.readSync(4);
            expect(bitstream.offset).to.equal(8);
        });

        expect(bitstream.offset).to.equal(4);
    });
    it('.simulateSync() can be nested', async () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(new Uint8Array(8));
        bitstream.readSync(4);

        await bitstream.simulate(async () => {
            bitstream.readSync(4);
            expect(bitstream.offset).to.equal(8);
            await bitstream.simulateSync(async () => {
                bitstream.readSync(4);
                expect(bitstream.offset).to.equal(12);
            });
            expect(bitstream.offset).to.equal(8);
        });
        expect(bitstream.offset).to.equal(4);
    });
    it('.simulateSync() restores offset after execution', async () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(new Uint8Array(2));
        bitstream.readSync(4);

        bitstream.simulateSync(() => {
            bitstream.readSync(4);
            expect(bitstream.offset).to.equal(8);
        });

        expect(bitstream.offset).to.equal(4);
    });
    it('.simulateSync() can be nested', async () => {
        let bitstream = new BitstreamReader();

        bitstream.addBuffer(new Uint8Array(8));
        bitstream.readSync(4);

        bitstream.simulateSync(() => {
            bitstream.readSync(4);
            expect(bitstream.offset).to.equal(8);
            bitstream.simulateSync(() => {
                bitstream.readSync(4);
                expect(bitstream.offset).to.equal(12);
            });
            expect(bitstream.offset).to.equal(8);
        });
        expect(bitstream.offset).to.equal(4);
    });
    it('.end() markes stream as ended', async () => {
        let bitstream = new BitstreamReader();
        expect(bitstream.ended).to.be.false;
        bitstream.end();
        expect(bitstream.ended).to.be.true;
    });
    it('.end() causes pending assure() to reject', async () => {
        let bitstream = new BitstreamReader();
        let thrown = bitstream.assure(8).then(() => false).catch(() => true);
        bitstream.end();
        expect(await thrown).to.be.true;
    });
    it('.end() causes pending read() to reject', async () => {
        let bitstream = new BitstreamReader();
        let thrown = bitstream.read(8).then(() => false).catch(() => true);
        bitstream.end();
        expect(await thrown).to.be.true;
    });
    it('.end() does not cause a pending optional assure() to reject', async () => {
        let bitstream = new BitstreamReader();
        let thrown = bitstream.assure(8, true).then(() => false).catch(() => true);
        bitstream.end();
        expect(await thrown).to.be.false;
    });
    it('.reset() throws if there is a pending operation', async () => {
        let bitstream = new BitstreamReader();
        let thrown = bitstream.assure(8, true).then(() => false).catch(() => true);
        expect(() => bitstream.reset()).to.throw;
    });
    it('.reset() does not throw if there is no pending operation', async () => {
        let bitstream = new BitstreamReader();
        expect(() => bitstream.reset()).not.to.throw;
    });
    it('.reset() unmarks a stream as ended', async () => {
        let bitstream = new BitstreamReader();
        expect(() => bitstream.addBuffer(new Uint8Array(1))).not.to.throw;
        bitstream.end();
        expect(bitstream.ended).to.be.true;
        expect(() => bitstream.addBuffer(new Uint8Array(1))).to.throw;
        bitstream.reset();
        expect(bitstream.ended).to.be.false;
        expect(() => bitstream.addBuffer(new Uint8Array(1))).not.to.throw;
    });
    it('.reset() clears buffers and resets read head to zero', async () => {
        let bitstream = new BitstreamReader();
        bitstream.addBuffer(new Uint8Array(1));
        bitstream.addBuffer(new Uint8Array(1));
        bitstream.addBuffer(new Uint8Array(1));

        // --

        bitstream.retainBuffers = true;
        bitstream.readSync(8);
        expect(bitstream.bufferIndex).to.equal(1);
        bitstream.readSync(8);
        expect(bitstream.bufferIndex).to.equal(2);
        expect(bitstream.offset).to.equal(16);
        expect(bitstream.available).to.equal(8);

        bitstream.reset();

        expect(bitstream.bufferIndex).to.equal(0);
        expect(bitstream.offset).to.equal(0);
        expect(bitstream.available).to.equal(0);
    });
});

describe('BitstreamReader (generated)', it => {
    for (let size = 1; size <= 52; ++size) {
        it(`reads ${size}bit values correctly`, async () => {
            let offset = 64 - size;
            let buf = new ArrayBuffer(8);
            let view = new DataView(buf);

            for (let i = 0; i < 10; ++i) {
                let num = Math.floor(Math.random() * 2 ** size);
                view.setBigUint64(0, BigInt(num), false);
                let reader = new BitstreamReader();
                reader.addBuffer(new Uint8Array(buf));
                reader.readSync(offset);
                expect(reader.readSync(size), `Test number #${i} (${num}) should have been read properly`).to.equal(num);
            }
        });
        if (size > 8 && (size % 8 == 0)) it(`reads ${size}bit values correctly (LE)`, async () => {
            let buf = new ArrayBuffer(8);
            let view = new DataView(buf);

            for (let i = 0; i < 10; ++i) {
                let num = Math.floor(Math.random() * 2 ** size);
                view.setBigUint64(0, BigInt(num), true);
                let reader = new BitstreamReader();
                reader.addBuffer(new Uint8Array(buf));
                expect(reader.readSync(size, 'little-endian'), `Test number #${i} (${num}) should have been read properly`).to.equal(num);
            }
        });
    }

    for (let size = 1; size < 52; ++size) {
        it(`reads cross-byte ${size}bit values correctly [1-bit offset]`, async () => {
            let offset = 64 - size;
            let buf = new ArrayBuffer(8);
            let view = new DataView(buf);

            for (let i = 0; i < 10; ++i) {
                let num = Math.floor(Math.random() * 2 ** size);
                view.setBigUint64(0, BigInt(num) << BigInt(1), false);
                let reader = new BitstreamReader();
                reader.addBuffer(new Uint8Array(buf));
                reader.readSync(offset - 1);
                expect(reader.readSync(size), `Test number #${i} (${num}) should have been read properly`).to.equal(num);
            }
        });
        if (size > 8 && (size % 8 == 0)) it(`reads cross-byte ${size}bit values correctly [1-bit offset] LE`, async () => {
            let buf = new ArrayBuffer(8);
            let view = new DataView(buf);

            for (let i = 0; i < 10; ++i) {
                let num = Math.floor(Math.random() * 2 ** size);
                view.setBigUint64(0, BigInt(num), true);
                let reader = new BitstreamReader();
                let shifted = new Uint8Array(buf).reduce((prev, cur, index: number, arr) => {
                    prev[index] = (cur >> 1) | ((index == 0) ? 0x0 : prev[index]);
                    prev[index + 1] = (cur << 7) & 0b10000000;
                    return prev;
                }, new Uint8Array(buf.byteLength + 1));
                reader.addBuffer(shifted);
                reader.readSync(1);
                const target = reader.readSync(size, 'little-endian');
                expect(target, `Test number #${i} (${num}) should have been read properly`).to.equal(num);
            }
        });
    }

    for (let size = 1; size < 49; ++size) {
        it(`reads cross-byte ${size}bit values correctly [4-bit offset]`, async () => {
            let offset = 64 - size;
            let buf = new ArrayBuffer(8);
            let view = new DataView(buf);

            for (let i = 0; i < 10; ++i) {
                let num = Math.floor(Math.random() * 2 ** size);
                view.setBigUint64(0, BigInt(num) << BigInt(4), false);
                let reader = new BitstreamReader();
                reader.addBuffer(new Uint8Array(buf));
                reader.readSync(offset - 4);
                expect(reader.readSync(size), `Test number #${i} (${num}) should have been read properly`).to.equal(num);
            }
        });
        if (size > 8 && (size % 8 == 0)) it(`reads cross-byte ${size}bit values correctly [4-bit offset] LE`, async () => {
            let buf = new ArrayBuffer(8);
            let view = new DataView(buf);

            for (let i = 0; i < 10; ++i) {
                let num = Math.floor(Math.random() * 2 ** size);
                view.setBigUint64(0, BigInt(num), true);
                let reader = new BitstreamReader();
                let shifted = new Uint8Array(buf).reduce((prev, cur, index, arr) => {
                    prev[index] = cur >> 4 | prev[index];
                    prev[index + 1] = cur << 4;
                    return prev;
                }, new Uint8Array(buf.byteLength + 1));
                reader.addBuffer(shifted);
                reader.readSync(4);
                expect(reader.readSync(size, 'little-endian'), `Test number #${i} (${num}) should have been read properly`).to.equal(num);
            }
        });
    }
});