import { FieldDefinition } from "./field-definition";

/**
 * Is a function that dynamically transform value in read and write
 * determines the value based on the current context.
 */
 export type TrasfromableType<T> = T extends Array<infer U> ? U : T; 
 export type ValueTransformers<T, V> =  {read?:(value: TrasfromableType<V>, f : FieldDefinition, instance? :  TrasfromableType<T>) => V, write?:(value: TrasfromableType<V>, f : FieldDefinition, instance? :  TrasfromableType<T>) => V};
