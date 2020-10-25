import { expect } from "chai";
import { describe } from "razmin";
import { BitstreamElement } from "./element";
import { Field } from "./field";
import { BitstreamReader } from "./reader";

describe('BitstreamElement', it => {
    it('correctly deserializes a basic element in synchronous mode', () => {
        class ExampleElement extends BitstreamElement {
            @Field(2) a;
            @Field(3) b;
            @Field(4) c;
            @Field(5) d;
            @Field(6) e;
        }

        //            |-|--|---|----|-----X-----
        let value = 0b10010110101011000010000000000000;
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(value);

        let bitstream = new BitstreamReader();
        bitstream.addBuffer(buffer);

        let element = ExampleElement.deserializeSync(bitstream);

        expect(element.a).to.equal(0b10);
        expect(element.b).to.equal(0b010);
        expect(element.c).to.equal(0b1101);
        expect(element.d).to.equal(0b01011);
        expect(element.e).to.equal(0b000010);
    });

    it('correctly deserializes nested elements', () => {

        class PartElement extends BitstreamElement {
            @Field(3) c;
            @Field(4) d;
        }

        class WholeElement extends BitstreamElement {
            @Field(1) a;
            @Field(2) b;
            @Field(0) part : PartElement;
            @Field(5) e;
            @Field(6) f;
        }

        //            ||-|--|---|----|-----X-----
        let value = 0b11010110101011000010100000000000;
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(value);

        let bitstream = new BitstreamReader();
        bitstream.addBuffer(buffer);

        let element = WholeElement.deserializeSync(bitstream);

        expect(element.a)       .to.equal(0b1);
        expect(element.b)       .to.equal(0b10);
        expect(element.part.c)  .to.equal(0b101);
        expect(element.part.d)  .to.equal(0b1010);
        expect(element.e)       .to.equal(0b10110);
        expect(element.f)       .to.equal(0b000101);

    });

    it('correctly deserializes inherited fields', () => {
        
        class BaseElement extends BitstreamElement {
            @Field(1) a;
            @Field(2) b;
        }

        class ExtendedElement extends BaseElement {
            @Field(3) c;
            @Field(4) d;
            @Field(5) e;
            @Field(6) f;
        }

        //            ||-|--|---|----|-----X-----
        let value = 0b11010110101011000010100000000000;
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(value);

        let bitstream = new BitstreamReader();
        bitstream.addBuffer(buffer);

        let element = ExtendedElement.deserializeSync(bitstream);

        expect(element.a).to.equal(0b1);
        expect(element.b).to.equal(0b10);
        expect(element.c).to.equal(0b101);
        expect(element.d).to.equal(0b1010);
        expect(element.e).to.equal(0b10110);
        expect(element.f).to.equal(0b000101);

    });

    it('understands Buffer when length is a multiple of 8', () => {
        class CustomElement extends BitstreamElement {
            @Field(4) a;
            @Field(4) b;
            @Field(16) c : Buffer;
        }

        //            |---|---|---------------X
        let value = 0b11010110101011000010100000000000;
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(value);

        let bitstream = new BitstreamReader();
        bitstream.addBuffer(buffer);

        let element = CustomElement.deserializeSync(bitstream);

        expect(element.a).to.equal(0b1101);
        expect(element.b).to.equal(0b0110);
        expect(element.c.length).to.equal(2);
        expect(element.c[0]).to.equal(0b10101100);
        expect(element.c[1]).to.equal(0b00101000);
    });

    it('fails when Buffer field has non multiple-of-8 length', () => {
        let caught : Error;

        try {
            class CustomElement extends BitstreamElement {
                @Field(4) a;
                @Field(4) b;
                @Field(7) c : Buffer;
            }
        } catch (e) {
            caught = e;
        }

        expect(caught, 'should have thrown an error').to.exist;
    });

    it('understands strings', () => {
        class CustomElement extends BitstreamElement {
            @Field(4) a;
            @Field(4) b;
            @Field(5) c : string;
        }

        let bitstream = new BitstreamReader();
        bitstream.addBuffer(Buffer.from([ 0b11010110 ]));
        bitstream.addBuffer(Buffer.from('hello', 'utf-8'));

        let element = CustomElement.deserializeSync(bitstream);

        expect(element.a).to.equal(0b1101);
        expect(element.b).to.equal(0b0110);
        expect(element.c).to.equal('hello');
    });
})