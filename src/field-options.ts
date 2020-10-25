import { ArrayOptions } from "./array-options";
import { BitstreamReader } from "./reader";
import { StringEncodingOptions } from "./string-encoding-options";
import { BitstreamSyntaxElement } from "./syntax-element";

export type Deserializer = (reader : BitstreamReader, field : BitstreamSyntaxElement, instance : any) => any;

export interface FieldOptions {
    deserializer? : Deserializer;
    stringEncoding? : StringEncodingOptions;
    array? : ArrayOptions;
    group? : string;
}
