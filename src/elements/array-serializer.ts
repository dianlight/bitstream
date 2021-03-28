import { BitstreamReader, BitstreamWriter } from "../bitstream";
import { BitstreamElement } from "./element";
import { resolveLength } from "./resolve-length";
import { Serializer } from "./serializer";
import { StructureSerializer } from "./structure-serializer";
import { FieldDefinition } from "./field-definition";

/**
 * Serializes arrays to/from bitstreams
 */
export class ArraySerializer implements Serializer {
    async read(reader: BitstreamReader, type : any, parent : BitstreamElement, field: FieldDefinition) {
        let count = 0;
        let elements = [];

        if (field.options.array.countFieldLength) {
            count = await reader.read(field.options.array.countFieldLength);
        } else if (field.options.array.count) {
            count = resolveLength(field.options.array.count, parent, field);
        }

        if (parent) {
            parent.readFields.push(field.name);
            parent[field.name] = [];
        }

        if (field.options.array.type === Number) {
            // Array of numbers. Useful when the array holds a single number field, but the 
            // bit length of the element fields is not 8 (where you would probably use a single `Buffer` field instead).
            // For instance, in somes IETF RFCs 10 bit words are used instead of 8 bit words (ie bytes).

            if (field.options.array.hasMore) {
                    do {
                        let continued : boolean;
                        
                        try {
                            parent.runWithFieldBeingComputed(field, () => 
                                continued = field.options.array.hasMore(parent, parent.parent), true);
                        } catch (e) {
                            throw new Error(`${parent?.constructor.name || '<none>'}#${String(field?.name || '<none>')} Failed to determine if array has more items via 'hasMore' discriminant: ${e.message}`);
                        }

                        if (!continued)
                            break;

                        let elementLength = field.options.array.elementLength;
                        elements.push(await reader.read(elementLength));
                    } while (true);
            } else {
                for (let i = 0; i < count; ++i) {
                    let elementLength = field.options.array.elementLength;
                    elements.push(await reader.read(elementLength));
                }
            }
        } else {
            if (field.options.array.hasMore) {
                let i = 0;
                do {
                    let continued : boolean;
                    
                    try {
                        parent.runWithFieldBeingComputed(field, () => 
                            continued = field.options.array.hasMore(parent, parent.parent), true);
                    } catch (e) {
                        throw new Error(`${parent?.constructor.name || '<none>'}#${String(field?.name || '<none>')} Failed to determine if array has more items via 'hasMore' discriminant: ${e.message}`);
                    }

                    if (!continued)
                        break;

                    let element : BitstreamElement;
                    let serializer = new StructureSerializer();

                    element = await serializer.read(reader, field.options.array.type, parent, field);
                    elements.push(element);
                    parent[field.name].push(element);

                } while (true);
            } else {
                for (let i = 0; i < count; ++i) {
                    let element : BitstreamElement;
                    let serializer = new StructureSerializer();

                    element = await serializer.read(reader, field.options.array.type, parent, field);
                    elements.push(element);
                    parent[field.name].push(element);
                }
            }
        }

        return elements;
    }
    
    write(writer : BitstreamWriter, type : any, parent : BitstreamElement, field : FieldDefinition, value : any[]) {
        if (!value) {
            throw new Error(`${parent?.constructor.name || '<none>'}#${String(field?.name) || '<none>'}: Cannot serialize a null array!`);
        }

        let length = value.length;

        if (field.options.array.countFieldLength) {
            let countFieldLength = field.options.array.countFieldLength;

            if (length >= Math.pow(2, countFieldLength)) {
                length = Math.pow(2, countFieldLength) - 1;
            }

            writer.write(field.options.array.countFieldLength, value.length);
        } else if (field.options.array.count) {
            try {
                length = resolveLength(field.options.array.count, parent, field);
            } catch (e) {
                throw new Error(`Failed to resolve length for array via 'count': ${e.message}`);
            }

            if (length > value.length) {
                throw new Error(
                    `${field.containingType.name}#${String(field.name)}: ` 
                    + `Array field's count determinant specified ${length} elements should be written ` 
                    + `but array only contains ${value.length} elements. `
                    + `Ensure that the value of the count determinant is compatible with the number of elements in ` 
                    + `the provided array.`
                );
            }
        }

        for (let i = 0; i < length; ++i) {
            if (field.options.array.type === Number) { 
                writer.write(field.options.array.elementLength, value[i]);
            } else {
                value[i].write(writer);
            }
        }
    }
}
