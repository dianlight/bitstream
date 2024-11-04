import { BitstreamReader, BitstreamWriter } from "../bitstream";
import { BitstreamElement } from "./element";
import { resolveLength } from "./resolve-length";
import { Serializer } from "./serializer";
import { FieldDefinition } from "./field-definition";
import { IncompleteReadResult } from "../common";
import { summarizeField } from "./utils";

/**
 * Serializes booleans to/from bitstreams.
 */
export class BooleanSerializer implements Serializer {
    *read(reader: BitstreamReader, type : any, parent : BitstreamElement, field: FieldDefinition): Generator<IncompleteReadResult, any> {
        let length = resolveLength(field.length, parent, field);
        if (!reader.isAvailable(length))
            yield { remaining: length, contextHint: () => summarizeField(field) };

        let numericValue = reader.readSync(length);

        const trueValue = field?.options?.boolean?.true ?? 1;
        const falseValue = field?.options?.boolean?.false ?? 0;
        const mode = field?.options?.boolean?.mode ?? 'true-unless';
        
        let boolValue;
        if (mode === 'true-unless')
            boolValue = numericValue !== falseValue;
        else if (mode === 'false-unless')
            boolValue = numericValue === trueValue;
        else if (mode === 'undefined')
            boolValue = numericValue === trueValue ? true : numericValue === falseValue ? false : undefined;

        if ( field?.options?.transformers?.read ){
            boolValue = field.options.transformers.read(boolValue,field, parent);
        }

        return boolValue;

    }

    write(writer: BitstreamWriter, type : any, instance: any, field: FieldDefinition, value: any) {
        
        const trueValue = field?.options?.boolean?.true ?? 1;
        const falseValue = field?.options?.boolean?.false ?? 0;
        const undefinedValue = field?.options?.boolean?.undefined ?? 0;
        let numericValue : number;

        if ( field?.options?.transformers?.write ){
            value = field.options.transformers.write(value,field, instance);
        }

        if (value === void 0)
            numericValue = undefinedValue;
        else if (value)
            numericValue = trueValue;
        else
            numericValue = falseValue;
        
        writer.write(resolveLength(field.length, instance, field), numericValue);
    }
}
