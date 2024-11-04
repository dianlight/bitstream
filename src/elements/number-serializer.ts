import { BitstreamElement } from "./element";
import { resolveLength } from "./resolve-length";
import { Serializer } from "./serializer";
import { FieldDefinition } from "./field-definition";
import { BitstreamReader, BitstreamWriter } from "../bitstream";
import { IncompleteReadResult } from "../common";
import { summarizeField } from "./utils";

/**
 * Serializes numbers to/from bitstreams
 */
export class NumberSerializer implements Serializer {
    *read(reader: BitstreamReader, type : any, parent : BitstreamElement, field: FieldDefinition): Generator<IncompleteReadResult, any> {
        let length : number;
        try {
            length = resolveLength(field.length, parent, field);
        } catch (e) {
            throw new Error(`Failed to resolve length of number via 'length' determinant: ${e.message}`);
        }

        if (!reader.isAvailable(length))
            yield { remaining: length, contextHint: () => summarizeField(field) };
        
        let format = field.options?.number?.format ?? 'unsigned';
        let numericValue;
        if (format === 'unsigned')
            numericValue = reader.readSync(length);
        else if (format === 'signed')
            numericValue = reader.readSignedSync(length);
        else if (format === 'float')
            numericValue = reader.readFloatSync(length);
        else
            throw new TypeError(`Unsupported number format '${format}'`);

        if ( field?.options?.transformers?.read ){
              numericValue = field.options.transformers.read(numericValue,field, parent);
        }

        return numericValue;
        
    }

    write(writer: BitstreamWriter, type : any, instance: any, field: FieldDefinition, value: any) {
        if (value === undefined)
            value = 0;

        let length : number;
        try {
            length = resolveLength(field.length, instance, field);
        } catch (e) {
            throw new Error(`Failed to resolve length of number via 'length' determinant: ${e.message}`);
        }

        let format = field.options?.number?.format ?? 'unsigned';

        if ( field?.options?.transformers?.write ){
            value = field.options.transformers.write(value,field, instance);
        }

        if (format === 'unsigned')
            writer.write(length, value);
        else if (format === 'signed')
            writer.writeSigned(length, value);
        else if (format === 'float')
            writer.writeFloat(length, value);
        else
            throw new TypeError(`Unsupported number format '${format}'`);
    }
}
