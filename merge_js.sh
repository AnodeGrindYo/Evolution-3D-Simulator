#!/bin/bash

OUTPUT_FILE="codepen.js"
rm -f "$OUTPUT_FILE"

# Récupère tous les fichiers .js (sauf les .min.js)
JS_FILES=$(find . -type f -name "*.js" ! -name "*.min.js" | sort)

declare -A CLASS_DEPENDENCIES
declare -A CLASS_FILES

# Parcours de chaque fichier pour détecter les classes et leurs dépendances
for FILE in $JS_FILES; do
    while IFS= read -r line; do
        # Détection d'une définition de classe
        if [[ $line =~ class[[:space:]]+([A-Za-z0-9_]+) ]]; then
            CLASS_NAME="${BASH_REMATCH[1]}"
            CLASS_FILES[$CLASS_NAME]="$FILE"
        fi
        # Détection d'une classe étendant une autre
        if [[ $line =~ class[[:space:]]+([A-Za-z0-9_]+)[[:space:]]+extends[[:space:]]+([A-Za-z0-9_]+) ]]; then
            CHILD_CLASS="${BASH_REMATCH[1]}"
            PARENT_CLASS="${BASH_REMATCH[2]}"
            CLASS_DEPENDENCIES[$CHILD_CLASS]="$PARENT_CLASS"
        fi
    done < "$FILE"
done

SORTED_FILES=()
ADDED_CLASSES=()

# Fonction récursive pour ajouter une classe et ses dépendances dans le bon ordre
add_class_and_dependencies() {
    local CLASS_NAME=$1
    local FILE=${CLASS_FILES[$CLASS_NAME]}
    
    # Si la classe hérite d'une autre, on ajoute d'abord la classe parente
    if [[ -n "${CLASS_DEPENDENCIES[$CLASS_NAME]}" ]]; then
        local PARENT_CLASS="${CLASS_DEPENDENCIES[$CLASS_NAME]}"
        if [[ ! " ${ADDED_CLASSES[@]} " =~ " ${PARENT_CLASS} " ]]; then
            add_class_and_dependencies "$PARENT_CLASS"
        fi
    fi

    # On ajoute le fichier de la classe s'il n'a pas encore été ajouté
    if [[ -n "$FILE" && ! " ${SORTED_FILES[@]} " =~ " ${FILE} " ]]; then
        SORTED_FILES+=("$FILE")
        ADDED_CLASSES+=("$CLASS_NAME")
    fi
}

# Pour chaque classe détectée, on insère son fichier en respectant les dépendances
for CLASS in "${!CLASS_FILES[@]}"; do
    add_class_and_dependencies "$CLASS"
done

# Ajoute les fichiers restants (ceux qui ne contiennent pas de classes ou non traités)
for FILE in $JS_FILES; do
    if [[ ! " ${SORTED_FILES[@]} " =~ " ${FILE} " ]]; then
        SORTED_FILES+=("$FILE")
    fi
done

# Fonction de traitement d'un fichier : suppression des import/export, encapsulation et assignation à window
process_file() {
    local FILE=$1
    echo -e "\n/*************************************************/" >> "$OUTPUT_FILE"
    echo -e "/* Fichier : $FILE */" >> "$OUTPUT_FILE"
    echo -e "/*************************************************/\n" >> "$OUTPUT_FILE"

    # Supprime les lignes d'import/export (la regex gère les espaces éventuels)
    sed -E 's/^[[:space:]]*import .*\;[[:space:]]*$//g; s/^[[:space:]]*export[[:space:]]+//g' "$FILE" > temp_file.js

    # Si le fichier contient une définition de classe, on l'encapsule dans une IIFE
    if grep -qE 'class[[:space:]]+[A-Za-z0-9_]+' temp_file.js; then
        # Récupère le nom de la première classe trouvée dans le fichier
        local CLASS_NAME
        CLASS_NAME=$(grep -Eo 'class[[:space:]]+[A-Za-z0-9_]+' temp_file.js | head -n 1 | awk '{print $2}')
        echo "(() => {" >> "$OUTPUT_FILE"
        cat temp_file.js >> "$OUTPUT_FILE"
        echo "window.$CLASS_NAME = $CLASS_NAME;" >> "$OUTPUT_FILE"
        echo "})();" >> "$OUTPUT_FILE"
    else
        # Sinon, on ajoute le contenu tel quel
        cat temp_file.js >> "$OUTPUT_FILE"
    fi

    echo -e "\n" >> "$OUTPUT_FILE"
    rm temp_file.js
}

# Traitement de chaque fichier dans l'ordre trié
for FILE in "${SORTED_FILES[@]}"; do
    process_file "$FILE"
done

# Vérification finale : s'assurer que chaque classe est définie sur window
echo -e "\n// Vérification des classes pour éviter 'undefined'" >> "$OUTPUT_FILE"
for CLASS in "${!CLASS_FILES[@]}"; do
    echo "window.$CLASS = window.$CLASS || {};" >> "$OUTPUT_FILE"
done

# Vérification de la syntaxe avec Node.js
if node -c "$OUTPUT_FILE" 2>/dev/null; then
    echo "✅ Vérification OK : Code sans erreurs de syntaxe"
else
    echo "❌ Erreur détectée ! Vérifie $OUTPUT_FILE pour les erreurs restantes."
fi

echo "✅ Code fusionné avec corrections dans $OUTPUT_FILE."
