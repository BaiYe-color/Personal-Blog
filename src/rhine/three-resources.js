// RhineLabUI, MIT, copyright 2026 LBEILC.
import * as THREE from "three";
export function disposeThreeTree(root) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    root.traverse((object)=>{
        if (!(object instanceof THREE.Mesh)) return;
        if (object instanceof THREE.InstancedMesh) object.dispose();
        geometries.add(object.geometry);
        for (const material of [
            object.material,
            object.userData.fullMaterial,
            object.userData.fastMaterial
        ].flat())if (material instanceof THREE.Material) materials.add(material);
    });
    for (const material of materials){
        for (const value of Object.values(material))if (value instanceof THREE.Texture) textures.add(value);
        material.dispose();
    }
    if (root instanceof THREE.Scene) {
        if (root.environment) textures.add(root.environment);
        if (root.background instanceof THREE.Texture) textures.add(root.background);
    }
    geometries.forEach((geometry)=>geometry.dispose());
    textures.forEach((texture)=>texture.dispose());
    root.clear();
}
