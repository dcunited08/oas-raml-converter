// @flow
const _ = require('lodash');
const Definition = require('../model/definition');
const Annotation = require('../model/annotation');
const Converter = require('../model/converter');
const Raml10CustomAnnotationConverter = require('../raml10/raml10CustomAnnotationConverter');
const ramlHelper = require('../helpers/raml10');

class Raml10AnnotationConverter extends Converter {
	
	_export(model:any) {
		const ramlDef = {};
		const annotations: Annotation[] = model.annotations;
		for (let i = 0; i < annotations.length; i++) {
			const value: Annotation = annotations[i];
			this.exportAnnotation(ramlDef, value);
		}
		
		return ramlDef;
	}
	
	exportAnnotation(ramlDef:any, value:Annotation) {
		const name: string = '(' + value.name + ')';
		ramlDef[name] = value.definition;
		if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
			const annotations: Annotation[] = value.annotations;
			for (let i = 0; i < annotations.length; i++) {
				const value: Annotation = annotations[i];
				this.exportAnnotation(ramlDef[name], value);
			}
		}
		if (this.def) Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, value.name, value.definition);
	}
	
	_import(ramlDef:any) {
		const annotations: Annotation[] = [];
		const skipAnnotations = ['oas-info', 'oas-tags-definition', 'oas-tags'];

		if (typeof ramlDef.annotations === 'object') {
			for (const id in ramlDef.annotations) {
				if (!ramlDef.annotations.hasOwnProperty(id) || _.includes(skipAnnotations, id)) continue;
				
				const name = _.isArray(ramlDef.annotations) ? ramlDef.annotations[id].name.replace('(','').replace(')','') : id.replace('(','').replace(')','');
				const value = _.isArray(ramlDef.annotations) ? ramlDef.annotations[id].definition : (ramlDef.annotations[id].hasOwnProperty('structuredValue') ? ramlDef.annotations[id].structuredValue : ramlDef.annotations[id]);
				annotations.push(this.importAnnotation(name, value));
			}
		}
		
		if (typeof ramlDef.scalarsAnnotations === 'object') {
			for (const id in ramlDef.scalarsAnnotations) {
				if (!ramlDef.scalarsAnnotations.hasOwnProperty(id)) continue;
				
				const value = ramlDef.scalarsAnnotations[id];
				if (id === 'baseUri') {
					const annotations: Annotation[] = this.model.baseUri.annotations ? this.model.baseUri.annotations : [];
					for (const index in value) {
						if (!value.hasOwnProperty(index)) continue;
						
						const val = value[index];
						annotations.push(this.importAnnotation(val.name, value[index].structuredValue));
						this.model.baseUri.annotations = annotations;
					}
				}
			}
		}

		if (!ramlDef.hasOwnProperty('annotations') && !ramlDef.hasOwnProperty('scalarAnnotations')) {
			const annotationPrefix = ramlHelper.getAnnotationPrefix;
			for (const id in ramlDef) {
				if (!ramlDef.hasOwnProperty(id)) continue;

				if (typeof ramlDef[id] === 'object' && !_.isEmpty(ramlDef[id])) {
					const annotations: Annotation[] = this._import(ramlDef[id]);
					if (!_.isEmpty(annotations)) ramlDef[id].annotations = annotations;
				}
				if (id.startsWith(annotationPrefix)) {
					annotations.push(this.importAnnotation(id.substring(1, id.length - 1), ramlDef[id]));
					delete ramlDef[id];
				}
			}
		}

		return annotations;
	}
	
	importAnnotation(name:string, value:any) {
		const annotationPrefix = ramlHelper.getAnnotationPrefix;
		const annotation = new Annotation();
		annotation.name = name;
		
		if (typeof value === 'object') {
			const annotations: Annotation[] = [];
			for (const index in value) {
				if (!value.hasOwnProperty(index)) continue;

				const val = value[index];
				if (index.startsWith(annotationPrefix)) {
					annotations.push(this.importAnnotation(index.substring(1, index.length - 1), val));
					delete value[index];
				}
			}
			if (!_.isEmpty(annotations)) annotation.annotations = annotations;
		}
		
		if (typeof value === 'object' && !_.isArray(value) && value != null) {
			const definition = new Definition();
			_.assign(definition, value);
			annotation.definition = definition;
		} else {
			annotation.definition = value;
		}
		
		return annotation;
	}
}

module.exports = Raml10AnnotationConverter;