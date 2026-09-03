# Logos de marcas

Poné acá un archivo por marca, con el nombre del `slug` que figura en
`src/data/brands.ts`:

    toyota.svg
    volkswagen.svg
    ford.svg
    ...

Se levantan solos con `import.meta.glob`: no hay que tocar ningún componente.
Mientras un logo no exista, el círculo muestra la inicial de la marca.

Formato: SVG monocromo preferentemente, o PNG con fondo transparente. Se
renderizan dentro de un círculo de 88 px, así que conviene que respiren un
poco en el centro.

Ojo con la licencia: los logos de las automotrices son marcas registradas. Su
uso nominativo para identificar publicaciones reales está bien; no los uses
para merchandising ni para dar a entender que la marca auspicia Autana.
