import { FieldDefinition } from "./field-definition";

/**
 * Is a function that dynamically transform value in read and write
 * determines the value based on the current context.
 */
 export type ValueTransformers<T, V> =  {read?:(value: V,instance : T, f : FieldDefinition) => V, write?:(value:V,instance : T, f : FieldDefinition) => V};
